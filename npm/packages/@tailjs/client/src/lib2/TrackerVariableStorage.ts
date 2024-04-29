import {
  DataClassification,
  DataPurposeFlags,
  PostRequest,
  PostResponse,
  Variable,
  VariableResultPromise,
  VariableResultStatus,
  VariableSetResult,
  getResultVariable,
  isSuccessResult,
  isVariablePatch,
  toVariableResultPromise,
} from "@tailjs/types";
import {
  If,
  apply,
  array,
  assign,
  clock,
  concat,
  forEach,
  get,
  isBoolean,
  isDefined,
  isObject,
  isUndefined,
  map,
  now,
  required,
  throwError,
} from "@tailjs/util";
import {
  ClientVariableGetter,
  ClientVariableResults,
  ClientVariableSetResult,
  ClientVariableSetter,
  LocalVariableScope,
  ReservedVariableKey,
  ReservedVariableType,
  StateVariable,
  StateVariableSource,
  TrackerContext,
  VARIABLE_CACHE_DURATION,
  VARIABLE_POLL_FREQUENCY,
  addPageLoadedListener,
  addResponseHandler,
  getStateVariables,
  isLocalScopeKey,
  request,
  stringToVariableKey,
  updateVariableState,
  variableKeyToString,
} from ".";

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
const pollingCallbacks = new Map<
  string,
  Set<(value: Variable<any>, poll: any) => void>
>();

export const createVariableStorage = (
  endpoint: string,
  context?: TrackerContext
): TrackerVariableStorage => {
  const pollVariables = clock(async () => {
    const getters: ClientVariableGetter[] = map(
      pollingCallbacks,
      ([key, callbacks]) =>
        !callbacks.size
          ? (pollingCallbacks.delete(key), undefined)
          : {
              ...stringToVariableKey(key),
              result: [...callbacks],
            }
    ) as any;

    await vars.get(...(getters as any));
  }, VARIABLE_POLL_FREQUENCY);

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
        const results: [StateVariableSource, number][] = [];

        const currentVariables = getStateVariables();
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
                const current = currentVariables.get(key);
                getter.init && updateCacheDuration(key, getter.cache);
                if (!getter.refresh && current?.expires! < now()) {
                  results.push([
                    {
                      ...current,
                      status: VariableResultStatus.Success,
                    } as any,
                    sourceIndex,
                  ]);
                  return undefined;
                } else if (isLocalScopeKey(getter)) {
                  if (isObject(getter.init)) {
                    const local = {
                      ...getter,
                      status: VariableResultStatus.Created,
                      ...getter.init,
                    } as StateVariableSource;
                    newLocal.push(setResultExpiration(local));
                    results.push([local, sourceIndex]);
                  }
                  return undefined;
                }

                return [getter, sourceIndex];
              });

              return requestGetters.length
                ? {
                    variables: { get: requestGetters as any },
                    deviceSessionId: context?.deviceSessionId,
                  }
                : false;
            })
          ).variables?.get ?? [];

        results.push(
          ...map(
            response,
            (response, i) => response && [response, requestGetters[i][1]]
          )
        );

        if (newLocal.length) {
          updateVariableState(newLocal);
        }

        let poll: boolean;
        results.forEach(
          ([result, i]) =>
            isSuccessResult(result) &&
            forEach(
              array(getters[i]?.result),
              (callback) => (
                (poll = false),
                callback?.(
                  getResultVariable(result),
                  (toggle = true) => (poll = toggle)
                ),
                poll &&
                  get(
                    pollingCallbacks,
                    variableKeyToString(result),
                    () => new Set()
                  ).add(callback!)
              )
            )
        );

        return results.map(([result]) => result);
      }, map(getters, (getter) => getter?.error) as any) as any,

    set: (
      ...setters: ClientVariableSetter[]
    ): ClientVariableResults<any, false> =>
      toVariableResultPromise(async () => {
        const currentVariables = getStateVariables();

        const newLocal: StateVariable[] = [];

        const results: ClientVariableSetResult[] = [];

        // Only request non-null setters, and use the most recent version we have already read, if any.
        const requestVariables = map(setters, (setter, sourceIndex) => {
          if (!setter) return undefined;
          const key = variableKeyToString(setter);
          const current = currentVariables.get(key);
          updateCacheDuration(key, setter.cache);
          if (isLocalScopeKey(setter)) {
            if (isDefined(setter.patch))
              return throwError("Local patching is not supported.");
            const local = {
              status: VariableResultStatus.Success,
              value: setter.value,
              classification: DataClassification.Anonymous,
              purposes: DataPurposeFlags.Anonymous,
              scope: -1,
              key: setter.key,
            };

            results[sourceIndex] = {
              status: current
                ? VariableResultStatus.Success
                : VariableResultStatus.Created,
              source: setter as any,
              current: local,
            };
            newLocal.push(setResultExpiration(local));
            return undefined;
          }
          if (!isVariablePatch(setter) && isUndefined(setter?.version)) {
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
          results[sourceIndex] = result as any;
        });

        return results as any;
      }, map(setters, (setter) => setter?.error) as any) as any,
  };

  const setResultExpiration = (
    variable: StateVariableSource,
    timestamp = now()
  ): StateVariable => ({
    ...variable,
    timestamp,
    expires:
      timestamp +
      (get(cacheDurations, variableKeyToString(variable)) ??
        VARIABLE_CACHE_DURATION),
  });
  addResponseHandler((response: PostResponse) => {
    const timestamp = now();
    const changed = concat(
      map(response.variables?.get, (result) => getResultVariable(result)),
      map(response.variables?.set, (result) => getResultVariable(result))
    );

    updateVariableState(apply(changed, setResultExpiration, timestamp));
  });

  return vars as any;
};

/** Suggests the reserved names and their corresponding values for local variables, and helps autocomplete string enums (purpose etc.). */
type GetterIntellisense<K extends string = ReservedVariableKey | "(any)"> =
  readonly (
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
  scope: LocalVariableScope;
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
