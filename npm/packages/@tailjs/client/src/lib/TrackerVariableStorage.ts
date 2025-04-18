import {
  extractKey,
  isSuccessResult,
  isVariableResult,
  PostRequest,
  PostResponse,
  toVariableResultPromise,
  VariableGetRequest,
  VariableGetter,
  VariableKey,
  VariableOperationParameter,
  VariableOperationResult,
  VariableResultStatus,
  VariableSetter,
  VariableValueSetter,
  WithCallbacks,
} from "@tailjs/types";
import {
  clock,
  concat2,
  forEach2,
  get2,
  isString,
  map2,
  now,
  Nullish,
  pick2,
  push2,
  remove2,
  required,
  skip2,
  some2,
} from "@tailjs/util";
import {
  addPageLoadedListener,
  addResponseHandler,
  addVariablesChangedListener,
  logError,
  request,
  StateVariable,
  StateVariableEntry,
  TrackerContext,
  tryGetVariable,
  updateVariableState,
  VARIABLE_CACHE_DURATION,
  VARIABLE_POLL_FREQUENCY,
} from ".";
import {
  ClientVariableGetResult,
  ClientVariableGetter,
  ClientVariableGetterCallback,
  ClientVariableKey,
  ClientVariableSetResult,
  ClientVariableSetter,
  isLocalScopeKey,
  maskEntityId,
  ReservedTrackerVariables,
  stringToVariableKey,
  variableKeyToString,
} from "..";

const KEY_PROPS: (keyof VariableKey)[] = ["scope", "key", "entityId", "source"];
const GETTER_REQUEST_PROPS: (keyof ClientVariableGetter)[] = [
  ...KEY_PROPS,
  "purpose",
  "ifModifiedSince",
  "ifNoneMatch",
  "passive",
];
const SETTER_REQUEST_PROPS: (keyof VariableValueSetter)[] = [
  ...KEY_PROPS,
  "value",
  "force",
  "ttl",
  "version",
];

export interface TrackerVariableStorage {
  get<
    Getters extends VariableOperationParameter<
      "get",
      ClientVariableGetter & { key: Keys; scope: Scopes }
    >,
    Keys extends string,
    Scopes extends string
  >(
    getters: WithCallbacks<"get", Getters, ReservedTrackerVariables>
  ): VariableOperationResult<
    "get",
    Getters,
    ClientVariableKey,
    ReservedTrackerVariables
  >;

  set<
    Setters extends VariableOperationParameter<
      "set",
      ClientVariableSetter & { key: Keys; scope: Scopes }
    >,
    Keys extends string,
    Scopes extends string
  >(
    setters: WithCallbacks<"set", Setters, ReservedTrackerVariables>
  ): VariableOperationResult<
    "set",
    Setters,
    ClientVariableKey,
    ReservedTrackerVariables
  >;
}
const callbackSourceSymbol = Symbol();
type RegisteredCallback = ClientVariableGetterCallback & {
  [callbackSourceSymbol]: ClientVariableGetter;
};
const activeCallbacks = new Map<string, Set<RegisteredCallback>>();

export const createVariableStorage = (
  endpoint: string,
  context?: TrackerContext
): TrackerVariableStorage => {
  const pollVariables = clock(async () => {
    const getters: ClientVariableGetter[] = map2(
      activeCallbacks,
      ([key, callbacks]) =>
        // Only request the variable if one or more callbacks originally requested the variable to be refreshed.
        some2(callbacks, (callback) => callback[callbackSourceSymbol]?.refresh)
          ? ({
              ...stringToVariableKey(key),
              refresh: true,
            } satisfies ClientVariableGetter)
          : skip2
    );

    getters.length && (await vars.get(getters));
  }, VARIABLE_POLL_FREQUENCY);

  const registerCallback = (
    mappedKey: string,
    callback: RegisteredCallback | undefined
  ) =>
    callback &&
    !!get2(activeCallbacks, mappedKey, () => new Set()).add(callback);

  const invokeCallbacks = (result: ClientVariableGetResult) => {
    if (!result) return;

    const key = variableKeyToString(result);
    const callbacks = remove2(activeCallbacks, key);
    if (!callbacks?.size) return;

    forEach2(
      callbacks,
      (callback) => callback(result) === true && registerCallback(key, callback)
    );
  };

  addPageLoadedListener(
    (loaded, stateDuration) =>
      pollVariables.toggle(
        loaded,
        loaded && stateDuration >= VARIABLE_POLL_FREQUENCY
      ),
    true
  );

  addVariablesChangedListener((changes) =>
    forEach2(changes, ([key, current]) => {
      if (current?.passive) {
        delete current.passive;
        return;
      }
      invokeCallbacks(
        current
          ? { status: VariableResultStatus.Success, ...current }
          : { status: VariableResultStatus.NotFound, ...key }
      );
    })
  );

  const vars: TrackerVariableStorage = {
    get: ((getters: ClientVariableGetter[]) =>
      toVariableResultPromise(
        "get",
        getters,
        async (getters: ClientVariableGetter[]) => {
          let key: string | Nullish;
          if (!getters[0] || isString(getters[0])) {
            key = getters[0];
            getters = getters.slice(1) as any;
          }
          context?.validateKey(key);

          const results = new Map<
            ClientVariableGetter,
            ClientVariableGetResult
          >();

          const newLocal: StateVariableEntry[] = [];

          const requestGetters: [
            request: VariableGetRequest,
            source: ClientVariableGetter
          ][] = map2(getters, (getter) => {
            const key = variableKeyToString(getter);
            const current = tryGetVariable(key);
            const purpose = getter.purpose;
            if (purpose && current?.schema?.usage.purposes[purpose] !== true) {
              results.set(getter, {
                ...getter,
                status: VariableResultStatus.Forbidden,
                error: `No consent for '${purpose}'.`,
              });
            } else if (!getter.refresh && current) {
              results.set(getter, {
                status: VariableResultStatus.Success,
                ...current,
              });
            } else if (isLocalScopeKey(getter)) {
              const value = getter.init?.();

              if (value) {
                const local: StateVariable = {
                  ...extractKey(getter),
                  version: "1",
                  created: timestamp,
                  modified: timestamp,
                  value: value,
                  cache: [timestamp, getter.ttl ?? current?.ttl],
                };

                push2(newLocal, [extractKey(local), local]);
                results.set(getter, {
                  status: VariableResultStatus.Success,
                  ...local,
                });
              } else {
                results.set(getter, {
                  status: VariableResultStatus.NotFound,
                  ...extractKey(getter),
                });
              }
            } else {
              return [
                pick2(getter, GETTER_REQUEST_PROPS) as VariableGetRequest,
                getter,
              ];
            }
            return skip2;
          });

          const timestamp = now();
          const response =
            (requestGetters.length &&
              (
                await request<PostRequest, PostResponse>(endpoint, {
                  variables: {
                    get: map2(requestGetters, ([getter]) => getter),
                  },
                  deviceSessionId: context?.deviceSessionId,
                })
              )?.variables?.get) ||
            [];

          const initSetters: [
            source: ClientVariableGetter,
            setter: ClientVariableSetter
          ][] = [];
          forEach2(response, (result, i) => {
            if (result?.status === VariableResultStatus.NotFound) {
              const getter = requestGetters[i][1];
              const initValue = getter.init?.();
              if (initValue != null) {
                initSetters.push([
                  getter,
                  { ...extractKey(getter), value: initValue },
                ]);
              }
            } else {
              results.set(requestGetters[i][1], maskEntityId(result!));
            }
          });

          if (initSetters.length) {
            forEach2(
              await vars.set(map2(initSetters, ([, setter]) => setter)).all(),
              (result, i) => {
                return results.set(
                  initSetters[i][0],
                  maskEntityId(
                    result.status === VariableResultStatus.Conflict
                      ? {
                          ...result,
                          status: VariableResultStatus.Success,
                        }
                      : result.status === VariableResultStatus.Success &&
                        result.value == null
                      ? { ...result, status: VariableResultStatus.NotFound }
                      : result
                  )
                );
              }
            );
          }

          if (newLocal.length) {
            // Update state first before invoking getter callbacks,
            // since polling callbacks only get success or not found results.
            //
            // The actual result must be used for the callback first time it is called.
            updateVariableState(newLocal);
          }

          return results;
        },
        {
          poll: (source: VariableGetter, callback) => {
            callback[callbackSourceSymbol] = source;
            return registerCallback(
              variableKeyToString(source as any),
              callback as any
            );
          },
          logCallbackError: (message, operation, error) =>
            logError("Variables.get", message, { operation, error }),
        }
      )) as any,

    set: ((setters: ClientVariableSetter[]) =>
      toVariableResultPromise(
        "set",
        setters,
        async (setters: ClientVariableSetter[]) => {
          let key: string | Nullish;
          if (!setters[0] || isString(setters[0])) {
            key = setters[0];
            setters = setters.slice(1) as any;
          }
          context?.validateKey(key);

          const localResults: StateVariableEntry[] = [];
          const results = new Map<
            ClientVariableSetter,
            ClientVariableSetResult
          >();

          const timestamp = now();

          let pendingPatches: ClientVariableSetter[] = [];

          // Only request non-null setters, and use the most recent version we have already read, if any.
          const requestVariables = map2(setters, (setter) => {
            const key = variableKeyToString(setter);
            const current = tryGetVariable(key);

            if (isLocalScopeKey(setter)) {
              const value = setter.patch
                ? setter.patch(current?.value)
                : setter.value;

              let local: StateVariable | undefined =
                value == null
                  ? undefined
                  : {
                      ...extractKey(setter),
                      created: current?.created ?? timestamp,
                      modified: timestamp,
                      version: current?.version
                        ? "" + (parseInt(current.version) + 1)
                        : "1",
                      scope: setter.scope,
                      key: setter.key,
                      value,
                      cache: [timestamp, setter.ttl],
                    };

              if (local) {
                local.cache = [
                  timestamp,
                  setter.ttl ?? VARIABLE_CACHE_DURATION,
                ];
              }

              results.set(
                setter,
                !local
                  ? {
                      status: VariableResultStatus.Success,
                      ...extractKey(setter),
                    }
                  : {
                      status: current
                        ? VariableResultStatus.Success
                        : VariableResultStatus.Created,
                      ...local,
                    }
              );

              push2(localResults, [extractKey(setter), local]);

              return skip2;
            }

            if (setter.patch) {
              pendingPatches.push(setter);
              return skip2;
            }

            if (setter?.version === undefined) {
              setter.version = current?.version;
            }

            return [pick2(setter, SETTER_REQUEST_PROPS as any), setter];
          });

          let attempts = 0;
          while (!attempts++ || pendingPatches.length) {
            const current = await vars
              .get(map2(pendingPatches, (patch) => extractKey(patch)))
              .all();
            forEach2(current, (result, i) => {
              const setter = pendingPatches[i];

              if (isSuccessResult(result, false)) {
                push2(requestVariables, [
                  {
                    ...setter,
                    patch: undefined,
                    value: pendingPatches[i].patch!(result?.value),
                    version: result.version,
                  },
                  setter,
                ]);
              } else {
                results.set(setter, result);
              }
            });
            pendingPatches = [];

            const response = !requestVariables.length
              ? []
              : required(
                  (
                    await request<PostRequest, PostResponse>(endpoint, {
                      variables: {
                        set: map2(requestVariables, ([setter]) => setter),
                      },
                      deviceSessionId: context?.deviceSessionId,
                    })
                  ).variables?.set,
                  "No result."
                );

            forEach2(response, (result, index) => {
              const [, setter] = requestVariables[index];
              if (
                attempts <= 3 &&
                setter.patch &&
                (result?.status === VariableResultStatus.Conflict ||
                  result?.status === VariableResultStatus.NotFound)
              ) {
                push2(pendingPatches, setter);
                return;
              }
              results.set(setter, maskEntityId(result!));
            });
          }

          if (localResults.length) {
            updateVariableState(localResults);
          }

          return results;
        },
        {
          logCallbackError: (message, operation, error) =>
            logError("Variables.set", message, { operation, error }),
        }
      )) as any,
  };

  addResponseHandler(({ variables }: PostResponse) => {
    if (!variables) return;

    const changed = concat2(
      map2(variables.get, (result) =>
        isVariableResult(result) ? result : skip2
      ),
      map2(variables.set, (result) =>
        isSuccessResult(result) ? result : skip2
      )
    );

    changed?.length &&
      updateVariableState(
        map2(
          changed,
          (result) =>
            [
              extractKey(result),
              isSuccessResult(result) ? result : undefined,
            ] as any
        )
      );
  });

  return vars as any;
};
