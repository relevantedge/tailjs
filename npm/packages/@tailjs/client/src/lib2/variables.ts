import {
  DataClassification,
  DataPurposeFlags,
  PostRequest,
  PostResponse,
  RestrictVariableTargets,
  StripPatchFunctions,
  Variable,
  VariableGetResult,
  VariableGetResults,
  VariableGetter,
  VariableGetters,
  VariableKey,
  VariableResultPromise,
  VariableResultStatus,
  VariableSetResult,
  VariableSetResults,
  VariableSetter,
  VariableSetters,
  extractKey,
  getResultVariable,
  isSuccessResult,
  isVariablePatch,
  toVariableResultPromise,
  variableScope,
} from "@tailjs/types";
import {
  Json,
  MaybeArray,
  PrettifyIntersection,
  apply,
  assign,
  clock,
  forEach,
  get,
  isBoolean,
  isDefined,
  isObject,
  isUndefined,
  join,
  map,
  now,
  required,
  throwError,
  toArray,
} from "@tailjs/util";
import {
  StateVariable,
  StateVariableSource,
  TrackerContext,
  VARIABLE_CACHE_DURATION,
  VARIABLE_POLL_FREQUENCY,
  addPageLoadedListener,
  addResponseHandler,
  getStateVariables,
  request,
  updateVariableState,
} from ".";

type VariableCacheSettings = {
  /**
   * The maximum number of milliseconds the value of this variable can be cached.
   * If omitted or `true` the default value of 3 seconds will be used.
   * `false` or 0 means the variable will not be cached.
   */
  cache?: number | boolean;

  /**
   * The variable is used for client-side communication and will not be posted to the server.
   */
  local?: boolean;
};

export type ClientVariableGetter<T = any> = PrettifyIntersection<
  StripPatchFunctions<
    RestrictVariableTargets<VariableGetter<T, false>, true>
  > & {
    /**
     * A callback to do something with the result.
     * If the second function is invoked the variable will be polled for changes, and the callback will be invoked
     * once when the value changes. To keep polling, keep calling the poll function every time the callback is invoked.
     */
    result?: MaybeArray<
      (
        value: Variable<any> | undefined,
        poll: (toggle?: boolean) => void
      ) => void
    >;

    /**
     * If the get requests fails this callback will be called instead of the entire operation throwing an error.
     * If it returns `false` an error will still be thrown.
     */
    error?: (result: VariableGetResult, error: string) => void | boolean;

    /**
     * Do not accept a cached version of the variable.
     */
    refresh?: boolean;
  } & VariableCacheSettings
>;

export type ClientVariableSetter<T = any> = PrettifyIntersection<
  StripPatchFunctions<
    RestrictVariableTargets<VariableSetter<T, false>, true>
  > & {
    /** A callback that will get invoked when the set operation has completed. */
    result?: (
      current: Variable<any> | undefined,
      source: VariableSetter
    ) => void;

    /**
     * If the get requests fails this callback will be called instead of the entire operation throwing an error.
     * If it returns `false` an error will still be thrown.
     */
    error?: (result: VariableGetResult, error: string) => void | boolean;
  } & VariableCacheSettings
>;

export const variableKeyToString = (key: VariableKey): string =>
  `${variableScope(key.scope)}\0${key.key}\0${key.targetId}`;

export const stringToVariableKey = (key: string): VariableKey => {
  const parts = key.split("\0");
  return {
    scope: variableScope(parts[0]),
    key: parts[1],
    targetId: parts[2],
  } as any;
};

const pollingCallbacks = new Map<
  string,
  Set<(value: Variable<any>, poll: any) => void>
>();

export const createVariableProvider = (
  endpoint: string,
  context?: TrackerContext
) => {
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

    await vars.get(...getters);
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
    get: <K extends VariableGetters<ClientVariableGetter>>(
      ...getters: VariableGetters<ClientVariableGetter, K>
    ): VariableResultPromise<RestrictVariableTargets<VariableGetResults<K>>> =>
      toVariableResultPromise(async () => {
        const results: [StateVariableSource, number][] = [];

        const currentVariables = getStateVariables();
        let requestGetters = map(
          getters as ClientVariableGetter[],
          (getter, sourceIndex) => [getter, sourceIndex]
        );

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
                } else if (getter.local) {
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
              toArray(getters[i]?.result),
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

    set: <V extends VariableSetters<ClientVariableSetter>>(
      ...setters: VariableSetters<ClientVariableSetter, V>
    ): VariableResultPromise<RestrictVariableTargets<VariableSetResults<V>>> =>
      toVariableResultPromise(async () => {
        const currentVariables = getStateVariables();

        const newLocal: StateVariable[] = [];

        const results: VariableSetResult[] = [];

        // Only request non-null setters, and use the most recent version we have already read, if any.
        const requestVariables = map(setters, (setter, sourceIndex) => {
          if (!setter) return undefined;
          const key = variableKeyToString(setter);
          const current = currentVariables.get(key);
          updateCacheDuration(key, setter.cache);
          if (setter.local) {
            if (isDefined(setter.patch))
              return throwError("Local patching is not supported.");
            const local = {
              status: VariableResultStatus.Success,
              value: setter.value,
              classification: DataClassification.Anonymous,
              purposes: DataPurposeFlags.Anonymous,
              ...extractKey(
                setter as ClientVariableSetter,
                setter as ClientVariableSetter
              ),
            };

            results[sourceIndex] = {
              status: VariableResultStatus.Success,
              source: setter,
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
                      set: requestVariables.map((variable) => variable[0]),
                    },
                    deviceSessionId: context?.deviceSessionId,
                  })
                ).variables?.set as any as VariableSetResult<any>[],
                "No result."
              );

        if (newLocal.length) {
          updateVariableState(newLocal);
        }

        forEach(response, (result, index) => {
          const [setter, sourceIndex] = requestVariables[index];

          results[sourceIndex] = result;
          result.source = setter;
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
    const changed = join(
      map(response.variables?.get, (result) => getResultVariable(result)),
      map(response.variables?.set, (result) => getResultVariable(result))
    );

    setResultExpiration(changed[0]);
    updateVariableState(apply(changed, setResultExpiration, timestamp));
  });

  return vars;
};
