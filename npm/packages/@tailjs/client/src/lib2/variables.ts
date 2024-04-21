import {
  PostRequest,
  PostResponse,
  RestrictVariableTargets,
  StripPatchFunctions,
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
  getResultVariable,
  getSuccessResults,
  isSuccessResult,
  isVariablePatch,
  toVariableResultPromise,
  variableScope,
} from "@tailjs/types";
import {
  Json,
  MaybeArray,
  clock,
  forEach,
  get,
  isUndefined,
  join,
  map,
  now,
  required,
  toArray,
} from "@tailjs/util";
import {
  VARIABLE_CACHE_DURATION,
  VARIABLE_POLL_FREQUENCY,
  addPageLoadedListener,
  addResponseHandler,
  getStateVariables,
  request,
  updateVariableState,
} from ".";

export type ClientVariableGetter<T = any> = StripPatchFunctions<
  RestrictVariableTargets<VariableGetter<T, false>, true>
> & {
  /**
   * A callback to do something with the result.
   * If the callback returns `true` the variable will be polled for changes,
   * and the callback will be invoked when the value changes at the specified frequency,
   * until it returns `false` (or nothing).
   */
  result?: MaybeArray<(value: Json) => void | boolean>;

  /**
   * Do not accept a cached version of the variable.
   */
  refresh?: boolean;
};

export type ClientVariableSetter<T = any> = StripPatchFunctions<
  RestrictVariableTargets<VariableSetter<T, false>, true>
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
  Set<(value: Json) => void | boolean>
>();

export const createVariableProvider = (endpoint: string) => {
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

  const vars = {
    get: <K extends VariableGetters<ClientVariableGetter>>(
      ...getters: VariableGetters<ClientVariableGetter, K>
    ): VariableResultPromise<RestrictVariableTargets<VariableGetResults<K>>> =>
      toVariableResultPromise(async () => {
        const results: VariableGetResult[] = [];

        const currentVariables = getStateVariables();
        const requestGetters = map(getters, (getter) => {
          const current =
            getter && currentVariables.get(variableKeyToString(getter));
          if (
            !getter?.refresh &&
            now() - current?.timestamp! <= VARIABLE_CACHE_DURATION
          ) {
            results.push({
              ...current,
              status: VariableResultStatus.Success,
            } as any);
            return undefined;
          }
          return getter;
        });

        if (requestGetters.length) {
          results.push(
            ...(required(
              (
                await request<PostRequest, PostResponse>(endpoint, {
                  variables: { get: requestGetters },
                })
              ).variables?.get,
              "No result."
            ) as VariableGetResult[])
          );
        }

        results.forEach(
          (result, i) =>
            isSuccessResult(result) &&
            forEach(
              toArray(getters[i]?.result),
              (callback) =>
                callback?.(result.value) === true &&
                get(
                  pollingCallbacks,
                  variableKeyToString(result),
                  () => new Set()
                ).add(callback)
            )
        );

        return results;
      }) as any,

    set: <V extends VariableSetters<ClientVariableSetter>>(
      ...variables: VariableSetters<ClientVariableSetter, V>
    ): VariableResultPromise<RestrictVariableTargets<VariableSetResults<V>>> =>
      toVariableResultPromise(async () => {
        const currentVariables = getStateVariables();

        // Only request non-null setters, and use the most recent version we have already read, if any.
        const requestVariables = map(variables, (setter) => {
          if (!setter) return undefined;
          const current = currentVariables.get(variableKeyToString(setter));
          if (!isVariablePatch(setter) && isUndefined(setter?.version)) {
            setter.version = current?.version;
            // Force the first set, we do not have any cached version to validate against.
            setter.force ??= !!setter.version;
          }
          return setter as VariableSetter;
        });

        const results =
          requestVariables.length > 0
            ? []
            : required(
                (
                  await request<PostRequest, PostResponse>(endpoint, {
                    variables: { set: variables },
                  })
                ).variables?.set as any as VariableSetResult<any>[],
                "No result."
              );

        let responseIndex = 0;
        forEach(
          results,
          (result) =>
            // Map sources back to the results. We only req
            result && (result.source = requestVariables[responseIndex++])
        );

        return results as any;
      }) as any,
  };

  addResponseHandler((response: PostResponse) => {
    const changed = join(
      map(response.variables?.get, (result) => getResultVariable(result)),
      map(response.variables?.set, (result) => getResultVariable(result))
    );
    updateVariableState(changed);
  });

  return vars;
};
