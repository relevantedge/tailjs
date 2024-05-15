import {
  DataClassification,
  DataPurposeFlags,
  PostRequest,
  PostResponse,
  VariableResultPromise,
  VariableResultStatus,
  getResultVariable,
  isSuccessResult,
  isVariablePatch,
  toVariableResultPromise,
} from "@tailjs/types";
import {
  If,
  IsAny,
  MaybeArray,
  apply,
  assign,
  clock,
  concat,
  filter,
  forEach,
  get,
  isBoolean,
  isPlainObject,
  map,
  now,
  pick,
  push,
  remove,
  required,
  throwError,
} from "@tailjs/util";
import {
  ClientVariable,
  ClientVariableCallback,
  ClientVariableGetResult,
  ClientVariableGetter,
  ClientVariableResults,
  ClientVariableSetResult,
  ClientVariableSetter,
  LocalVariableScopeValue,
  ReservedVariableKey,
  ReservedVariableType,
  StateVariable,
  TrackerContext,
  VARIABLE_CACHE_DURATION,
  VARIABLE_POLL_FREQUENCY,
  addPageLoadedListener,
  addResponseHandler,
  isLocalScopeKey,
  localVariableScope,
  request,
  stringToVariableKey,
  toNumericVariableEnums,
  tryGetVariable,
  updateVariableState,
  variableKeyToString,
} from ".";

const KEY_PROPS: any[] = ["scope", "key", "targetId", "version"];
const VARIABLE_PROPS: any[] = [
  ...KEY_PROPS,
  "created",
  "modified",
  "classification",
  "purposes",
  "tags",
  "readonly",
  "value",
];
const GETTER_PROPS: any[] = [...KEY_PROPS, "init", "purpose", "refresh"];
const SETTER_PROPS: any[] = [...VARIABLE_PROPS, "value", "force", "patch"];

export interface TrackerVariableStorage {
  // Omit `init` to allow intellisense to suggest the actual type for reserved keys.
  get<K extends readonly Omit<ClientVariableGetter, "init">[]>(
    ...getters: (K & ValidateParameters<K, true>) | GetterIntellisense
  ): VariableResultPromise<ClientVariableResults<K, true>>;
  // Omit `value` to allow intellisense to suggest the actual type for reserved keys.
  set<V extends readonly Omit<ClientVariableSetter, "value">[]>(
    ...setters: (V & ValidateParameters<V, false>) | SetterIntellisense
  ): VariableResultPromise<ClientVariableResults<V, false>>;
}
const activeCallbacks = new Map<string, Set<ClientVariableCallback>>();

export const createVariableStorage = (
  endpoint: string,
  context?: TrackerContext
): TrackerVariableStorage => {
  const pollVariables = clock(async () => {
    const getters: ClientVariableGetter[] = map(
      activeCallbacks,
      ([key, callbacks]) => ({
        ...stringToVariableKey(key),
        result: [...callbacks],
      })
    ) as any;

    getters.length && (await vars.get(...(getters as any)));
  }, VARIABLE_POLL_FREQUENCY);

  const registerCallbacks = (
    mappedKey: string,
    callbacks?: MaybeArray<ClientVariableCallback>
  ) =>
    apply(callbacks, (callback) =>
      get(activeCallbacks, mappedKey, () => new Set()).add(callback)
    );

  const invokeCallbacks = (
    result: ClientVariableGetResult | ClientVariableSetResult | undefined
  ) => {
    if (!isSuccessResult(result)) return;
    const key = variableKeyToString(result);
    const variable = getResultVariable(result);
    let poll: boolean;
    forEach(remove(activeCallbacks, key), (callback) => {
      poll = false;
      callback?.(
        variable,
        tryGetVariable(variable as any) as any,
        (toggle = true) => (poll = toggle)
      );
      poll && registerCallbacks(key, callback);
    });
  };

  addPageLoadedListener(
    (loaded, stateDuration) =>
      pollVariables.toggle(
        loaded,
        loaded && stateDuration >= VARIABLE_POLL_FREQUENCY
      ),
    true
  );

  const cacheDurations = new Map<string, number>();
  const updateCacheDuration = (
    key: string,
    duration: undefined | number | boolean
  ) =>
    assign(
      cacheDurations,
      key,
      isBoolean(duration) ? (duration ? undefined : 0) : duration
    );

  const vars = {
    get: (
      ...getters: ClientVariableGetter[]
    ): VariableResultPromise<ClientVariableResults<any, true>> =>
      toVariableResultPromise(async () => {
        const results: [ClientVariableGetResult, number][] = [];

        let requestGetters = map(getters, (getter, sourceIndex) => [
          getter,
          sourceIndex,
        ]);

        const newLocal: StateVariable[] = [];
        const response =
          (
            await request<PostRequest, PostResponse>(endpoint, () => {
              requestGetters = map(requestGetters, ([getter, sourceIndex]) => {
                if (!getter) return undefined;

                const key = variableKeyToString(getter);
                registerCallbacks(key, getter.result);

                const current = tryGetVariable(key);
                getter.init && updateCacheDuration(key, getter.cache);
                if (!getter.refresh && current?.expires! < now()) {
                  push(results, [
                    {
                      ...current,
                      status: VariableResultStatus.Success,
                    } as any,
                    sourceIndex,
                  ]);
                } else if (isLocalScopeKey(getter)) {
                  if (isPlainObject(getter.init)) {
                    const local: ClientVariableGetResult<any, any, any, true> =
                      {
                        ...toNumericVariableEnums(getter),
                        status: VariableResultStatus.Created,
                        ...getter.init,
                      };
                    if (local.value != null) {
                      push(newLocal, setResultExpiration(local));
                      push(results, [local, sourceIndex]);
                    }
                  }
                } else {
                  return [pick(getter, GETTER_PROPS), sourceIndex];
                }
              });

              return requestGetters.length
                ? {
                    variables: { get: map(requestGetters, 0) as any },
                    deviceSessionId: context?.deviceSessionId,
                  }
                : false;
            })
          ).variables?.get ?? [];

        push(
          results,
          ...map(
            response,
            (response, i) => response && [response, requestGetters[i][1]]
          )
        );

        if (newLocal.length) {
          updateVariableState(newLocal);
        }

        return results.map(([result]) => (invokeCallbacks(result), result));
      }, map(getters, (getter) => getter?.error) as any) as any,

    set: (
      ...setters: ClientVariableSetter[]
    ): ClientVariableResults<any, false> =>
      toVariableResultPromise(async () => {
        const newLocal: StateVariable[] = [];

        const results: ClientVariableSetResult[] = [];

        // Only request non-null setters, and use the most recent version we have already read, if any.
        const requestVariables = map(setters, (setter, sourceIndex) => {
          if (!setter) return undefined;
          const key = variableKeyToString(setter);
          const current = tryGetVariable(key);
          updateCacheDuration(key, setter.cache);
          if (isLocalScopeKey(setter)) {
            if (setter.patch != null)
              return throwError("Local patching is not supported.");
            const local: ClientVariable<any, any, true> = {
              value: setter.value,
              classification: DataClassification.Anonymous,
              purposes: DataPurposeFlags.Necessary,
              scope: localVariableScope(setter.scope),
              key: setter.key,
            };

            results[sourceIndex] = {
              status: current
                ? VariableResultStatus.Success
                : VariableResultStatus.Created,
              source: setter as any,
              current: local,
            };
            push(newLocal, setResultExpiration(local));
            return undefined;
          }
          if (!isVariablePatch(setter) && setter?.version === undefined) {
            setter.version = current?.version;
            // Force the first set, we do not have any cached version to validate against.
            setter.force ??= !!setter.version;
          }
          return [setter as ClientVariableSetter, sourceIndex];
        });

        const response =
          requestVariables.length > 0
            ? []
            : required(
                (
                  await request<PostRequest, PostResponse>(endpoint, {
                    variables: {
                      set: requestVariables.map(
                        (variable) => variable[0] as any
                      ),
                    },
                    deviceSessionId: context?.deviceSessionId,
                  })
                ).variables?.set,
                "No result."
              );

        if (newLocal.length) {
          updateVariableState(newLocal);
        }

        forEach(response, (result, index) => {
          const [setter, sourceIndex] = requestVariables[index];
          (result as any).source = setter;
          invokeCallbacks((results[sourceIndex] = result as any));
        });

        return results as any;
      }, map(setters, (setter) => setter?.error) as any) as any,
  };

  const setResultExpiration = (
    variable: ClientVariable,
    timestamp = now()
  ): StateVariable => ({
    ...pick(variable, VARIABLE_PROPS),
    timestamp,
    expires:
      timestamp +
      (get(cacheDurations, variableKeyToString(variable)) ??
        VARIABLE_CACHE_DURATION),
  });
  addResponseHandler(({ variables }) => {
    if (!variables) return;
    const timestamp = now();
    const changed = concat(
      map(variables.get, (result) => getResultVariable(result)),
      map(variables.set, (result) => getResultVariable(result))
    );

    changed?.length &&
      updateVariableState(apply(changed, setResultExpiration, timestamp));
  });

  return vars as any;
};

/** Suggests the reserved names and their corresponding values for local variables, and helps autocomplete string enums (purpose etc.). */
export type GetterIntellisense<
  K extends string = ReservedVariableKey | "(any)"
> = readonly (
  | ClientVariableGetter<any, "(any)" | (string & {}), false>
  | (K extends infer K
      ? ClientVariableGetter<ReservedVariableType<K>, K & string, true>
      : // Only suggest reserved local names when local is true. This does that trick.

        never)
)[];

/** Suggests the reserved names and their corresponding values for local variables, and helps autocomplete string enums (purpose etc.). */
type SetterIntellisense<K extends string = ReservedVariableKey | "(any)"> =
  readonly (
    | ClientVariableSetter<any, "(any)" | (string & {}), false>
    | (K extends infer K
        ? ClientVariableSetter<ReservedVariableType<K>, K & string, true>
        : // Only suggest reserved local names when local is true. This does that trick.

          never)
  )[];

type ValidateParameter<P, Getters> = P extends {
  key: infer K & string;
  scope: LocalVariableScopeValue;
}
  ? If<
      Getters,
      ClientVariableGetter<ReservedVariableType<K>, K & string, true>,
      ClientVariableSetter<ReservedVariableType<K>, K & string, true>
    >
  : P extends { key: infer K & string }
  ? If<
      Getters,
      ClientVariableGetter<any, K & string, false>,
      ClientVariableSetter<any, K & string, false>
    >
  : never;

type ValidateParameters<P, Getters> = P extends readonly []
  ? []
  : P extends readonly [infer Item, ...infer Rest]
  ? readonly [
      ValidateParameter<Item, Getters>,
      ...ValidateParameters<Rest, Getters>
    ]
  : P extends readonly (infer Item)[]
  ? readonly ValidateParameter<Item, Getters>[]
  : never;
