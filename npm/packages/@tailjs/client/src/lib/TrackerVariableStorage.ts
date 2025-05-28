import {
  createPollCallback,
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
  VariableValueSetter,
  WithCallbacks,
} from "@tailjs/types";
import {
  clock,
  concat,
  forEach,
  get,
  isString,
  map,
  now,
  Nullish,
  pick,
  push,
  remove,
  required,
  skip,
  some,
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
    const getters: ClientVariableGetter[] = map(
      activeCallbacks,
      ([key, callbacks]) =>
        // Only request the variable if one or more callbacks originally requested the variable to be refreshed.
        some(callbacks, (callback) => callback[callbackSourceSymbol]?.refresh)
          ? ({
              ...stringToVariableKey(key),
              refresh: true,
            } satisfies ClientVariableGetter)
          : skip
    );

    getters.length && (await vars.get(getters));
  }, VARIABLE_POLL_FREQUENCY);

  const registerCallback = (
    mappedKey: string,
    callback: RegisteredCallback | undefined
  ) =>
    callback &&
    !!get(activeCallbacks, mappedKey, () => new Set()).add(callback);

  const invokeCallbacks = (result: ClientVariableGetResult) => {
    if (!result) return;

    const key = variableKeyToString(result);
    const callbacks = remove(activeCallbacks, key);
    if (!callbacks?.size) return;

    forEach(
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
    forEach(changes, ([key, current]) => {
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

  const registerPollCallback = (source: VariableGetter, callback: any) => {
    callback[callbackSourceSymbol] = source;
    return registerCallback(
      variableKeyToString(source as any),
      callback as any
    );
  };

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
          ][] = map(getters, (getter) => {
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

                push(newLocal, [extractKey(local), local]);
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
                pick(getter, GETTER_REQUEST_PROPS) as VariableGetRequest,
                getter,
              ];
            }
            return skip;
          });

          forEach(results, ([getter, result]) => {
            if (getter.poll) {
              const callback = createPollCallback(getter as any, result);
              const pollingCallback = async (result: any) =>
                (await callback(result)) === true &&
                registerPollCallback?.(getter as any, pollingCallback);
              pollingCallback(result);
            }
          });

          const timestamp = now();
          const response =
            (requestGetters.length &&
              (
                await request<PostRequest, PostResponse>(endpoint, {
                  variables: {
                    get: map(requestGetters, ([getter]) => getter),
                  },
                  deviceSessionId: context?.deviceSessionId,
                })
              )?.variables?.get) ||
            [];

          const initSetters: [
            source: ClientVariableGetter,
            setter: ClientVariableSetter
          ][] = [];
          forEach(response, (result, i) => {
            const getter = requestGetters[i][1];
            if (
              result?.status === VariableResultStatus.NotFound &&
              getter.init
            ) {
              const initValue = getter.init();
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
            forEach(
              await vars.set(map(initSetters, ([, setter]) => setter)).all(),
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
          poll: registerPollCallback,
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
          const requestVariables = map(setters, (setter) => {
            const key = variableKeyToString(setter);
            const current = tryGetVariable(key);

            if (isLocalScopeKey(setter)) {
              const value = setter.patch
                ? setter.patch(current?.value)
                : setter.value;

              if (current?.value != null && value === current?.value) {
                return skip;
              }

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

              push(localResults, [extractKey(setter), local]);

              return skip;
            }

            if (setter.patch) {
              pendingPatches.push(setter);
              return skip;
            }

            if (setter?.version === undefined) {
              setter.version = current?.version;
            }

            return [pick(setter, SETTER_REQUEST_PROPS as any), setter];
          });

          let attempts = 0;
          while (!attempts++ || pendingPatches.length) {
            const current = await vars
              .get(map(pendingPatches, (patch) => extractKey(patch)))
              .all();
            forEach(current, (result, i) => {
              const setter = pendingPatches[i];

              if (isSuccessResult(result, false)) {
                push(requestVariables, [
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
                        set: map(requestVariables, ([setter]) => setter),
                      },
                      deviceSessionId: context?.deviceSessionId,
                    })
                  ).variables?.set,
                  "No result."
                );

            forEach(response, (result, index) => {
              const [, setter] = requestVariables[index];
              if (
                attempts <= 3 &&
                setter.patch &&
                (result?.status === VariableResultStatus.Conflict ||
                  result?.status === VariableResultStatus.NotFound)
              ) {
                push(pendingPatches, setter);
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

    const changed = concat(
      map(variables.get, (result) =>
        isVariableResult(result) ? result : skip
      ),
      map(variables.set, (result) => (isSuccessResult(result) ? result : skip))
    );

    changed?.length &&
      updateVariableState(
        map(
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
