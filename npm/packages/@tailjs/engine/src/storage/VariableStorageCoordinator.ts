import {
  dataClassification,
  DataPurposeName,
  dataPurposes,
  DataUsage,
  extractKey,
  filterKeys,
  filterRangeValue,
  formatValidationErrors,
  formatVariableKey,
  isSuccessResult,
  isTransientError,
  isVariableResult,
  KnownVariableMap,
  OptionalPurposes,
  RemoveScopeRestrictions,
  SchemaValidationContext,
  SchemaValidationError,
  SchemaVariable,
  ServerScoped,
  ServerVariableScope,
  toVariableResultPromise,
  TypeResolver,
  ValidatableSchemaEntity,
  Variable,
  VariableGetResult,
  VariableGetter,
  VariableKey,
  VariableOperationParameter,
  VariableOperationResult,
  VariableQuery,
  VariableQueryOptions,
  VariableQueryResult,
  VariableResult,
  VariableResultStatus,
  VariableSetResult,
  VariableSetter,
  VariableValueSetter,
  WithCallbacks,
} from "@tailjs/types";
import {
  AllRequired,
  ArrayOrSelf,
  delay,
  forEach2,
  formatError,
  isArray,
  keyCount2,
  map2,
  merge2,
  Nullish,
  skip2,
  some2,
  throwError,
} from "@tailjs/util";
import {
  copyTrace,
  getTrace,
  ReadOnlyVariableStorage,
  TrackerEnvironment,
  VariableSplitStorage,
  VariableStorage,
  VariableStorageQuery,
  withTrace,
  WithTrace,
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
  [P in ServerVariableScope]?: {
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
      return copyTrace(
        {
          // Document somewhere that a conflict may turn into a forbidden error.
          status: VariableResultStatus.Forbidden,
          ...extractKey(result),
        },
        result as any
      ) as any;
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

export class VariableStorageCoordinator<
  KnownVariables extends KnownVariableMap = never
> {
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
    } = this._settings = merge2(settings, [defaultContext, DEFAULT_SETTINGS], {
      overwrite: false,
    }));
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

  private _assignResultSchemas<
    T extends Iterable<[any, RemoveScopeRestrictions<VariableResult>]>
  >(results: T): T {
    for (const [, result] of results) {
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
      ServerScoped<VariableGetter, boolean> & { key: Keys; scope: Scopes }
    >,
    Keys extends string,
    Scopes extends string
  >(
    getters: WithCallbacks<"get", Getters, KnownVariables>,
    context: VariableStorageContext = this._defaultContext
  ): VariableOperationResult<
    "get",
    Getters,
    ServerScoped<VariableKey, false>,
    KnownVariables
  > {
    return toVariableResultPromise(
      "get",
      getters,
      async (getters: VariableGetter[]) => {
        const results = new Map<VariableKey, VariableGetResult>();
        if (!getters.length) return results;

        type TraceData = {
          getter: VariableGetter;
          sourceIndex: number;
          type: SchemaVariable;
          targetPurpose: DataPurposeName | undefined;
        };

        let pendingGetters: WithTrace<VariableGetter, TraceData>[] = [];

        let index = 0;
        for (const getter of getters) {
          try {
            validateEntityId(getter, context);
          } catch (error) {
            results.set(getter, {
              status: VariableResultStatus.BadRequest,
              ...extractKey(getter),
              error: formatError(error, this._settings.includeStackTraces),
            });
            continue;
          }

          const type = this._getVariable(getter);
          if (type) {
            const targetPurpose = getter.purpose;

            pendingGetters.push(
              withTrace(getter, {
                getter,
                sourceIndex: index++,
                type,
                targetPurpose,
              })
            );
            continue;
          }
          results.set(getter, {
            status: VariableResultStatus.BadRequest,
            ...extractKey(getter),
            error: formatVariableKey(getter, "is not defined"),
          });
        }

        const pendingSetters: WithTrace<VariableValueSetter, TraceData>[] = [];

        let retry = 0;
        while (pendingGetters.length && retry++ < this._errorRetries.attempts) {
          if (retry > 1) await retryDelay(this._errorRetries);

          for (let result of await this._storage.get(
            pendingGetters.splice(0)
          )) {
            const {
              source: getter,
              sourceIndex,
              type,
              targetPurpose,
            } = getTrace(result);

            const validationContext = mapValidationContext(
              context,
              getter.purpose
            );
            result = censorResult(result, type, validationContext);
            results.set(getter, result);
            if ("value" in result) {
              continue;
            } else if (isTransientError(result)) {
              pendingGetters.push(getter);
            } else if (
              result.status === VariableResultStatus.NotFound &&
              getter.init
            ) {
              try {
                let initValue = await getter.init();
                if (initValue == null) {
                  continue;
                }
                let errors: SchemaValidationError[] = [];
                initValue = type.validate(
                  initValue,
                  undefined,
                  validationContext,
                  errors
                );
                if (errors.length) {
                  results.set(getter, {
                    status: VariableResultStatus.BadRequest,
                    ...extractKey(getter),
                    error: formatValidationErrors(errors),
                  });
                }
                pendingSetters.push(
                  withTrace(
                    {
                      ...extractKey(getter),
                      ttl: getter.ttl,
                      version: null,
                      value: initValue,
                    },
                    { getter, sourceIndex, type: type, targetPurpose }
                  )
                );
              } catch (error) {
                results.set(getter, {
                  status: VariableResultStatus.Error,
                  ...extractKey(getter),
                  error: formatError(error, this._settings.includeStackTraces),
                });
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
            const {
              source: setter,
              getter,
              type,
              targetPurpose,
            } = getTrace(result);

            const validationContext = mapValidationContext(
              context,
              targetPurpose
            );
            if (result.status === VariableResultStatus.Conflict) {
              results.set(
                getter,
                censorResult(
                  {
                    ...result,
                    status: VariableResultStatus.Success,
                  },
                  type,
                  validationContext
                )
              );
            } else if (isTransientError(result)) {
              pendingSetters.push(setter);
            } else {
              // Cast as any. The set result that doesn't overlap is a delete result,
              // but a delete result at this point would mean an invariant was violated
              // since we not add pending setters for null or undefined init results.
              results.set(
                getter,
                censorResult(result, type, validationContext) as any
              );
            }
          }
        }

        return this._assignResultSchemas(results);
      }
    ) as any;
  }

  public set<
    Setters extends VariableOperationParameter<
      ServerScoped<VariableSetter, boolean> & { key: Keys; scope: Scopes }
    >,
    Keys extends string,
    Scopes extends string
  >(
    setters: WithCallbacks<"set", Setters, KnownVariables>,
    context: VariableStorageContext = this._defaultContext
  ): VariableOperationResult<
    "set",
    Setters,
    ServerScoped<VariableKey, false>,
    KnownVariables
  > {
    return toVariableResultPromise("set", setters, async (setters) => {
      const results = new Map<VariableKey, VariableSetResult>();

      if (!setters.length) return results;
      const validationContext = mapValidationContext(context, undefined);

      type TraceData = {
        sourceIndex: number;
        type: SchemaVariable;
        retries: number;
        current: Variable | undefined;
      };

      const pendingSetters: WithTrace<VariableSetter, TraceData>[] = [];

      let index = 0;
      for (const setter of setters) {
        let type: SchemaVariable | undefined;
        try {
          validateEntityId(setter, context);
          type = this._getVariable(setter);
        } catch (error) {
          results.set(setter, {
            status: VariableResultStatus.BadRequest,
            ...extractKey(setter),
            error: formatError(error, this._settings.includeStackTraces),
          });
          continue;
        }

        if (type) {
          pendingSetters.push(
            withTrace(setter, {
              sourceIndex: index++,
              type: type,
              retries: 0,
              current: undefined,
            })
          );
          continue;
        }
        results.set(setter, {
          status: VariableResultStatus.BadRequest,
          ...extractKey(setter),
          error: formatVariableKey(setter, "is not defined."),
        });
      }

      let retry = 0;
      while (pendingSetters.length && retry++ <= this._patchRetries.attempts) {
        if (retry > 1) {
          // Add random delay in the hope that we resolve conflict races.
          await retryDelay(this._patchRetries);
        }

        const valueSetters: WithTrace<VariableValueSetter, TraceData>[] = [];

        for (const current of await this._storage.get(
          pendingSetters
            .splice(0)
            .map((setter) => copyTrace(extractKey(setter), setter))
        )) {
          const trace = getTrace(current);
          const { source: setter, type } = trace;

          if (!isSuccessResult(current, false)) {
            results.set(setter, current);
            // Retry
            if (
              isTransientError(current) &&
              trace.retries++ < this._errorRetries.attempts
            ) {
              pendingSetters.push(setter);
            }
            continue;
          }
          if (current.status === VariableResultStatus.NotModified) {
            results.set(setter, {
              status: VariableResultStatus.Error,
              ...extractKey(current),
              error: `Unexpected status 304 returned when requesting the current version of ${formatVariableKey(
                setter
              )}.`,
            });
            continue;
          }

          const currentVariable = (trace.current = isSuccessResult(current)
            ? current
            : undefined);

          try {
            const errors: SchemaValidationError[] = [];
            let value = setter.patch
              ? setter.patch(
                  // The patch function runs on uncensored data so external logic do not have to deal with missing properties.
                  currentVariable?.value
                )
              : setter.value;

            if (
              (setter.patch || currentVariable) &&
              (value ?? undefined) === currentVariable?.value
            ) {
              // No change from patch, or same value as current if any. Trying to delete a non-existing variable is an error.
              results.set(setter, {
                ...(currentVariable ?? extractKey(setter)),
                status: VariableResultStatus.Success,
              });
              continue;
            }

            value = type.censor(
              type.validate(
                value,
                currentVariable?.value,
                validationContext,
                errors
              ),
              validationContext
            );

            if (errors.length) {
              results.set(setter, {
                status: errors[0].forbidden
                  ? VariableResultStatus.Forbidden
                  : VariableResultStatus.BadRequest,
                ...extractKey(setter),
                error: formatValidationErrors(errors),
              });
              continue;
            }

            if (!setter.patch && setter.version !== currentVariable?.version) {
              // Access tests are done before concurrency tests.
              // It would be weird to be told there was a conflict, then resolve it, and then be told you
              // were not allowed in the first place.

              results.set(
                setter,
                !currentVariable
                  ? {
                      status: VariableResultStatus.NotFound,
                      ...extractKey(setter),
                    }
                  : {
                      ...currentVariable,
                      status: VariableResultStatus.Conflict,
                    }
              );
              // We do not need to continue until the underlying storage tells us about the conflict since we already know at this point.
              continue;
            }

            // Add a clone of the source setter with the new validated and censored value.
            valueSetters.push(
              copyTrace(
                {
                  ...setter,
                  patch: undefined,
                  version: currentVariable?.version, // This is the same as the version on the source value setters because get.
                  value,
                },
                // Reuse original setter data, so we know what to do if retried.
                setter
              )
            );
          } catch (e) {
            results.set(setter, {
              status: VariableResultStatus.Error,
              ...extractKey(setter),
              error: formatError(e, this._settings.includeStackTraces),
            });
          }
        }

        if (!valueSetters.length) {
          continue;
        }

        for (let result of await this._storage.set(valueSetters)) {
          const { source: setter, type } = getTrace(result);

          const validationContext = mapValidationContext(context, undefined);
          if (
            result.status === VariableResultStatus.Conflict &&
            setter.patch &&
            retry < this._patchRetries.attempts
          ) {
            // Reapply the patch.
            pendingSetters.push(setter);
            continue;
          }

          results.set(setter, censorResult(result, type, validationContext));
        }
      }

      return this._assignResultSchemas(results);
    }) as any;
  }

  private async _queryOrPurge<R>(
    filters: readonly VariableQuery<ServerVariableScope>[],
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
    filters: ArrayOrSelf<VariableQuery<ServerVariableScope>>,
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
    filters: ArrayOrSelf<VariableQuery<ServerVariableScope>>,
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
            return variableType
              ? censored
                ? variable.value !== censored
                  ? { ...variable, value: censored }
                  : variable
                : skip2
              : variable;
          });
        }
        return result;
      },
      context,
      false
    );
  }

  public async refresh(
    filters: ArrayOrSelf<VariableQuery<ServerVariableScope>>,
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
