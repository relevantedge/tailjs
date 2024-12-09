import {
  dataClassification,
  DataPurposeName,
  dataPurposes,
  DataUsage,
  extractKey,
  filterKeys,
  filterRangeValue,
  formatKey,
  formatValidationErrors,
  isSuccessResult,
  isTransientError,
  isVariableResult,
  OptionalPurposes,
  SchemaValidationContext,
  SchemaValidationError,
  SchemaVariable,
  toVariableResultPromise,
  TypeResolver,
  ValidatableSchemaEntity,
  Variable,
  VariableGetResult,
  VariableGetter,
  VariableOperationParameter,
  VariableOperationResult,
  VariableQuery,
  VariableQueryOptions,
  VariableQueryResult,
  VariableResultStatus,
  VariableScope,
  VariableSetResult,
  VariableSetter,
  VariableValueSetter,
  WithCallbackIntellisense,
} from "@tailjs/types";
import {
  AllRequired,
  ArrayOrSelf,
  assign2,
  delay,
  forEach2,
  formatError,
  isArray,
  keyCount2,
  map2,
  Nullish,
  skip2,
  some2,
  throwError,
} from "@tailjs/util";
import {
  AddSourceTrace,
  addSourceTrace,
  addTrace,
  AddTrace,
  ReadOnlyVariableStorage,
  traceSymbol,
  TrackerEnvironment,
  VariableSplitStorage,
  VariableStorage,
  VariableStorageQuery,
} from "..";

export interface StorageMapping {
  storage: ReadOnlyVariableStorage;
  schemas?: string[];
}

export interface RetrySettings {
  /** Maximum number of retries before giving up. */
  attempts: number;

  /** Delay between retries. */
  delay: number;

  /**
   * The maximum value of an additional random delay that gets added to the delay
   * to spread out retry attempts to break ties and reduce contention when multiple processes
   * are attempting the same action simultaneously.
   */
  jitter: number;
}

export type VariableStorageMappings = {
  [P in VariableScope]?: {
    storage: VariableStorage;
    schemas?: string[];
    prefixes?: {
      [P in string]: {
        storage: ReadOnlyVariableStorage;
        schemas?: string[];
      };
    };
  };
};

export interface VariableStorageCoordinatorSettings {
  retries?: {
    /**
     * Retry settings for patch conflicts.
     *
     * The default is 50 ms between a maximum of 10 retries with 25 ms jitter.
     */
    patch?: Partial<RetrySettings>;

    /**
     * Retry settings for transient errors.
     *
     * The default is 500 ms between a maximum of 3 retries with 250 ms jitter.
     */
    error?: Partial<RetrySettings>;
  };

  /** Include stack traces in errors. */
  includeStackTraces?: boolean;

  scopes: VariableStorageMappings;
}

const DEFAULT_SETTINGS: AllRequired<
  Omit<VariableStorageCoordinatorSettings, "scopes">
> = {
  retries: {
    patch: {
      attempts: 10,
      delay: 50,
      jitter: 25,
    },
    error: {
      attempts: 3,
      delay: 500,
      jitter: 250,
    },
  },

  includeStackTraces: true,
};

export const isTransientErrorObject = (error: any) =>
  error?.["transient"] || (error?.message + "").match(/\btransient\b/i) != null;

export type VariableStorageContext = {
  /** The current entity IDs for session and user scope. */
  scope?: {
    sessionId?: string;
    deviceId?: string;
    userId?: string;
    consent?: DataUsage;
  };
  optionalPurposes?: OptionalPurposes;
  /**
   * Whether restrictions on data access visibility applies.
   * @default false
   */
  trusted?: boolean;
};

const mapValidationContext = (
  context: VariableStorageContext,
  targetPurpose: DataPurposeName | undefined
): SchemaValidationContext =>
  context.scope?.consent || targetPurpose
    ? { ...context, targetPurpose, consent: context.scope?.consent }
    : context;

const censorResult = <Result extends VariableGetResult | VariableSetResult>(
  result: Result,
  type: ValidatableSchemaEntity,
  context: SchemaValidationContext
): Result => {
  if ("value" in result && result.value != null) {
    if (
      (result.value = type.censor((result as any).value, context)) == undefined
    ) {
      return {
        status: VariableResultStatus.Forbidden,
        [traceSymbol]: result[traceSymbol],
        ...extractKey(result),
      } as any;
    }
  }
  return result;
};

const retryDelay = (settings: RetrySettings) =>
  delay(settings.delay + Math.random() * settings.jitter);

const validateEntityId = <T extends { scope: string; entityId?: string }>(
  target: T,
  context: VariableStorageContext
): T => {
  if (context.scope == null || target.scope === "global") {
    if (target.entityId == undefined) {
      throw new Error(
        `An entity ID for ${target.scope} scope is required in this context.`
      );
    }
    return target;
  }
  const expectedId = context.scope[target.scope + "Id"];
  if (expectedId == undefined) {
    throw new Error(
      `No ID is available for ${target.scope} scope in the current session.`
    );
  }
  if (target.entityId && expectedId !== target.entityId) {
    throw new Error(
      `The specified ID in ${target.scope} scope does not match that in the current session.`
    );
  }
  target.entityId = expectedId;
  return target;
};

const getScopeSourceKey = (scope: string, source?: string | null) =>
  source ? scope + "|" + source : scope;

export type VariableStorageCoordinatorQueryOptions = VariableQueryOptions & {
  context?: VariableStorageContext;
};

export type VariableStorageCoordinatorPurgeOptions = {
  context?: VariableStorageContext;
  bulk?: boolean;
};

export class VariableStorageCoordinator {
  private readonly _storage: VariableSplitStorage;
  private readonly _types: TypeResolver;
  private readonly _storageTypeResolvers = new Map<string, TypeResolver>();
  private readonly _defaultContext: VariableStorageContext;
  private readonly _patchRetries: Required<RetrySettings>;
  private readonly _errorRetries: Required<RetrySettings>;
  private readonly _settings: AllRequired<
    Omit<VariableStorageCoordinatorSettings, "scopes">
  >;

  constructor(
    { scopes: storage, ...settings }: VariableStorageCoordinatorSettings,
    types: TypeResolver,
    defaultContext: VariableStorageContext = { trusted: false }
  ) {
    this._storage = new VariableSplitStorage(storage);
    this._defaultContext = defaultContext;
    this._types = types;

    forEach2(storage, ([scope, defaultConfig]) => {
      if (!defaultConfig) return;

      this._storageTypeResolvers.set(
        getScopeSourceKey(scope),
        defaultConfig.schemas
          ? this._types.subset(defaultConfig.schemas)
          : this._types
      );
      forEach2(defaultConfig.prefixes, ([prefix, config]) => {
        if (!config) return;

        this._storageTypeResolvers.set(
          getScopeSourceKey(scope, prefix),
          config.schemas ? this._types.subset(config.schemas) : this._types
        );
      });
    });

    ({
      retries: { patch: this._patchRetries, error: this._errorRetries },
    } = this._settings = assign2(
      settings,
      defaultContext,
      DEFAULT_SETTINGS,
      true,
      false
    ));
  }

  private _getTypeResolver({
    scope,
    source,
  }: {
    scope: string;
    source?: string | Nullish;
  }) {
    return (
      this._storageTypeResolvers.get(getScopeSourceKey(scope, source)) ??
      throwError(
        `No storage is defined for ${scope}${source ? `:${source}` : ""}`
      )
    );
  }
  private _getVariable(key: {
    scope: string;
    key: string;
    source?: string | null;
  }): SchemaVariable | undefined {
    return this._getTypeResolver(key).getVariable(key.scope, key.key, false);
  }

  private _assignResultSchemas<T extends readonly any[]>(results: T): T {
    for (const result of results) {
      if (isVariableResult(result)) {
        const variable = this._getVariable(result);
        if (variable) {
          result.schema = {
            type: variable.type.id,
            version: variable.type.version,
            usage: variable.usage,
          };
        }
      }
    }
    return results;
  }

  public get<
    Getters extends VariableOperationParameter<
      VariableGetter,
      VariableScope,
      any
    >
  >(
    getters: WithCallbackIntellisense<Getters>,
    context: VariableStorageContext = this._defaultContext
  ): VariableOperationResult<"get", Getters, VariableScope, VariableScope> {
    return toVariableResultPromise(
      "get",
      getters,
      async (getters: VariableGetter[]) => {
        if (!getters.length) return [];

        type TraceData = [number, SchemaVariable, DataPurposeName | undefined];

        const results: VariableGetResult[] = [];
        let pendingGetters: AddSourceTrace<VariableGetter, TraceData>[] = [];

        let index = 0;
        for (const key of getters) {
          try {
            validateEntityId(key, context);
          } catch (error) {
            results[index++] = {
              status: VariableResultStatus.BadRequest,
              ...extractKey(key),
              error: formatError(error, this._settings.includeStackTraces),
            };
            continue;
          }

          const variable = this._getVariable(key);
          if (variable) {
            const targetPurpose = key.purpose;

            pendingGetters.push(
              addSourceTrace(key, [index++, variable, targetPurpose])
            );
            continue;
          }
          results[index++] = {
            status: VariableResultStatus.BadRequest,
            ...extractKey(key),
            error: formatKey(key, "is not defined"),
          };
        }

        const pendingSetters: AddSourceTrace<VariableValueSetter, TraceData>[] =
          [];

        let retry = 0;
        while (pendingGetters.length && retry++ < this._errorRetries.attempts) {
          if (retry > 1) await retryDelay(this._errorRetries);

          for (let result of await this._storage.get(
            pendingGetters.splice(0)
          )) {
            const [getter, [sourceIndex, variable, targetPurpose]] =
              result[traceSymbol];

            const validationContext = mapValidationContext(
              context,
              getter.purpose
            );
            result = censorResult(result, variable, validationContext);
            if ("value" in (results[sourceIndex] = result)) {
              continue;
            } else if (isTransientError(result)) {
              pendingGetters.push(getter);
            } else if (
              result.status === VariableResultStatus.NotFound &&
              "init" in getter
            ) {
              try {
                let initValue = await getter.init();
                if (initValue == null) {
                  continue;
                }
                let errors: SchemaValidationError[] = [];
                initValue = variable.validate(
                  initValue,
                  undefined,
                  validationContext,
                  errors
                );
                if (errors.length) {
                  results[sourceIndex] = {
                    status: VariableResultStatus.BadRequest,
                    ...extractKey(getter),
                    error: formatValidationErrors(errors),
                  };
                }
                pendingSetters.push(
                  addSourceTrace(
                    {
                      ...extractKey(getter),
                      ttl: getter.ttl,
                      version: null,
                      value: initValue,
                    },
                    [sourceIndex, variable, targetPurpose]
                  )
                );
              } catch (error) {
                results[sourceIndex] = {
                  status: VariableResultStatus.Error,
                  ...extractKey(getter),
                  error: formatError(error, this._settings.includeStackTraces),
                };
              }
            }
          }
        }

        retry = 0;
        while (pendingSetters.length && retry++ < this._errorRetries.attempts) {
          if (retry > 1) await retryDelay(this._errorRetries);

          for (const result of await this._storage.set(
            pendingSetters.splice(0)
          )) {
            const [setter, [sourceIndex, variable, targetPurpose]] =
              result[traceSymbol];

            const validationContext = mapValidationContext(
              context,
              targetPurpose
            );
            if (result.status === VariableResultStatus.Conflict) {
              if (result.current?.value) {
                results[sourceIndex] = censorResult(
                  {
                    status: VariableResultStatus.Success,
                    ...result.current,
                  },
                  variable,
                  validationContext
                );
              } else {
                //
                pendingSetters.push(setter);
              }
            } else if (isTransientError(result)) {
              pendingSetters.push(setter);
            } else {
              if (result.status === VariableResultStatus.NotModified) {
                result.status = VariableResultStatus.Success;
              }
              // Cast as any. The set result that doesn't overlap is a delete result,
              // but a delete result at this point would mean an invariant was violated
              // since we not add pending setters for null or undefined init results.
              results[sourceIndex] = censorResult(
                result,
                variable,
                validationContext
              ) as any;
            }
          }
        }

        return this._assignResultSchemas(results);
      }
    ) as any;
  }

  public set<
    Setters extends VariableOperationParameter<
      VariableSetter,
      VariableScope,
      any
    >
  >(
    setters: WithCallbackIntellisense<Setters>,
    context: VariableStorageContext = this._defaultContext
  ): VariableOperationResult<"set", Setters, VariableScope, VariableScope> {
    return toVariableResultPromise("set", setters, async (setters) => {
      const validationContext = mapValidationContext(context, undefined);

      if (!setters.length) return [];

      const results: VariableSetResult[] = [];
      let pendingSetters: AddSourceTrace<
        VariableSetter,
        [
          sourceIndex: number,
          variable: SchemaVariable,
          retries: number,
          current: Variable | undefined
        ]
      >[] = [];

      let index = 0;
      for (const key of setters) {
        try {
          validateEntityId(key, context);
        } catch (error) {
          results[index++] = {
            status: VariableResultStatus.BadRequest,
            ...extractKey(key),
            error: formatError(error, this._settings.includeStackTraces),
          };
          continue;
        }

        const variable = this._getVariable(key);

        if (variable) {
          pendingSetters.push(
            addSourceTrace(key, [index++, variable, 0, undefined])
          );
          continue;
        }
        results[index++] = {
          status: VariableResultStatus.BadRequest,
          ...extractKey(key),
          error: formatKey(key, "is not defined"),
        };
      }

      let retry = 0;
      while (pendingSetters.length && retry++ <= this._patchRetries.attempts) {
        if (retry > 1) {
          // Add random delay in the hope that we resolve conflict races.
          await retryDelay(this._patchRetries);
        }

        const valueSetters: AddTrace<
          VariableValueSetter,
          (typeof pendingSetters)[number][typeof traceSymbol]
        >[] = [];

        for (const result of await this._storage.get(
          pendingSetters
            .splice(0)
            .map((setter) => addTrace(extractKey(setter), setter[traceSymbol]))
        )) {
          const [setter, [sourceIndex, variable]] = result[traceSymbol];

          if (!isSuccessResult(result, false)) {
            results[sourceIndex] = result;
            // Retry
            if (
              isTransientError(result) &&
              result[traceSymbol][1][2]++ < this._errorRetries.attempts
            ) {
              pendingSetters.push(setter);
            }
            continue;
          }
          const current = (result[traceSymbol][1][3] =
            "version" in result ? result : undefined);

          try {
            const errors: SchemaValidationError[] = [];

            let value = variable.censor(
              variable.validate(
                "patch" in setter
                  ? setter.patch(
                      // The patch function runs on uncensored data so external logic do not have to deal with missing properties.
                      current?.value
                    )
                  : setter.value,
                current?.value,
                validationContext,
                errors
              ),
              validationContext
            );

            if (errors.length) {
              results[sourceIndex] = {
                status: errors[0].forbidden
                  ? VariableResultStatus.Forbidden
                  : VariableResultStatus.BadRequest,
                ...extractKey(setter),
                error: formatValidationErrors(errors),
              };
              continue;
            }

            if (!("patch" in setter) && setter.version !== current?.version) {
              // Access tests are done before concurrency tests.
              // It would be weird to be told there was a conflict, then resolve it, and then be told you
              // were not allowed in the first place.

              results[sourceIndex] = {
                status: VariableResultStatus.Conflict,
                ...extractKey(setter),
                current: current?.value
                  ? variable.censor(current?.value, validationContext) ?? {}
                  : null,
              };
              // We do not need to continue until the underlying storage tells us about the conflict since we already know at this point.
              // Yet, it must still also do its own check since it may be used from many places.
              continue;
            }

            // Add a clone of the source setter with the new validated and censored value.
            valueSetters.push(
              addTrace(
                {
                  ...setter,
                  patch: undefined,
                  version: current?.version,
                  value,
                },
                // Reuse original setter data, so we know what to do if retried.
                setter[traceSymbol]
              )
            );
          } catch (e) {
            results[sourceIndex] = {
              status: VariableResultStatus.Error,
              ...extractKey(setter),
              error: formatError(e, this._settings.includeStackTraces),
            };
          }
        }

        if (!valueSetters.length) {
          continue;
        }

        for (let result of await this._storage.set(valueSetters)) {
          const [setter, [sourceIndex, variable]] = result[traceSymbol];
          const validationContext = mapValidationContext(context, undefined);
          if (
            result.status === VariableResultStatus.Conflict &&
            "patch" in setter &&
            retry < this._patchRetries.attempts
          ) {
            // Reapply the patch.
            pendingSetters.push(setter);
            continue;
          }

          results[sourceIndex] = censorResult(
            result,
            variable,
            validationContext
          );
        }
      }

      return this._assignResultSchemas(results);
    }) as any;
  }

  private async _queryOrPurge<R>(
    filters: readonly VariableQuery<VariableScope>[],
    action: (filter: VariableStorageQuery[]) => Promise<R>,
    context: VariableStorageContext,
    purgeFilter: boolean
  ): Promise<R> {
    const mapped: VariableStorageQuery[] = [];
    for (let query of this._storage.splitSourceQueries(filters)) {
      if (!context.trusted) {
        if (query.scope !== "global") {
          if (query.entityIds?.length! > 1) {
            throwError(
              `Entity IDs are not allowed in query filters for the ${context.scope} scope from session context.`
            );
          }
          query.entityIds = [
            validateEntityId(
              { scope: query.scope, entityId: query.entityIds?.[0]! },
              context
            ).entityId,
          ];
        } else if (!query.entityIds) {
          throwError(
            "Specific Entity IDs are required for queries in the global scope from untrusted context."
          );
        }
      }

      let variableKeys: string[] = [];
      const resolver = this._getTypeResolver(query);

      if (query.classification || query.purposes) {
        const scopeVariables = resolver.variables[query.scope];
        forEach2(scopeVariables, ([key, variable]) => {
          const usage = variable.usage;

          if (
            !filterRangeValue(
              usage.classification,
              query.classification,
              (classification) => dataClassification(classification, true)
            )
          ) {
            return;
          }

          if (
            query.purposes &&
            !dataPurposes.test(usage.purposes, query.purposes, {
              intersect: purgeFilter ? "all" : "some",
            })
          ) {
            return;
          }

          variableKeys.push(key);
        });

        if (!variableKeys.length) {
          // No keys
          continue;
        }

        if (query.keys) {
          variableKeys = filterKeys(query.keys, variableKeys);
        }
        if (variableKeys.length < keyCount2(scopeVariables)) {
          query = {
            ...query,
            keys: variableKeys,
          };
        }
      }

      mapped.push(query);
    }

    let retry = 0;
    while (retry++ < this._errorRetries.attempts) {
      try {
        return await action(mapped);
      } catch (e) {
        if (
          retry === this._errorRetries.attempts ||
          !isTransientErrorObject(e)
        ) {
          throw e;
        }
        await retryDelay(this._errorRetries);
      }
    }
    // Never happens.
    return undefined as any;
  }

  public async purge(
    filters: ArrayOrSelf<VariableQuery<VariableScope>, false>,
    {
      context = this._defaultContext,
      bulk,
    }: VariableStorageCoordinatorPurgeOptions = {}
  ): Promise<number> {
    if (!isArray(filters)) {
      filters = [filters];
    }

    if (
      (!bulk || !context.trusted) &&
      some2(filters, (filter) => !filter.entityIds)
    ) {
      return throwError(
        context.trusted
          ? "If no entity IDs are specified, the bulk option must be set to true."
          : "Bulk delete are not allowed from untrusted context."
      );
    }
    let purged = 0;
    await this._queryOrPurge(
      filters,
      async (filters) => (purged += await this._storage.purge(filters)),
      context,
      true
    );
    return purged;
  }

  public async query(
    filters: ArrayOrSelf<VariableQuery<VariableScope>>,
    {
      context = this._defaultContext,
      ...options
    }: VariableStorageCoordinatorQueryOptions = {}
  ): Promise<VariableQueryResult> {
    return await this._queryOrPurge(
      !isArray(filters) ? [filters] : filters,
      async (filters) => {
        const result = await this._storage.query(filters, options);
        const consent = context.scope?.consent;
        if (consent) {
          const validationContext = mapValidationContext(context, undefined);
          result.variables = map2(result.variables, (variable) => {
            const variableType = this._getVariable(variable);
            const censored = variableType?.censor(
              variable.value,
              validationContext
            );
            return censored ?? skip2;
          });
        }
        return result;
      },
      context,
      false
    );
  }

  public async refresh(
    filters: ArrayOrSelf<VariableQuery<VariableScope>>,
    context = this._defaultContext
  ) {
    if (!isArray(filters)) {
      filters = [filters];
    }

    let refreshed = 0;
    await this._queryOrPurge(
      filters,
      async (filters) => (refreshed += await this._storage.refresh(filters)),
      context,
      true
    );
    return refreshed;
  }

  public async initialize?(environment: TrackerEnvironment) {
    await this._storage.initialize(environment);
  }
}
