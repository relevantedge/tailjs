import {
  copyKey,
  dataClassification,
  DataPurposeName,
  DataUsage,
  filterKeys,
  filterRangeValue,
  formatKey,
  formatValidationErrors,
  isSuccessResult,
  isTransientError,
  OptionalPurposes,
  SchemaValidationContext,
  SchemaValidationError,
  SchemaVariable,
  testPurposes,
  TypeResolver,
  ValidatableSchemaEntity,
  Variable,
  VariableGetResult,
  VariableGetter,
  VariableQuery,
  VariableQueryOptions,
  VariableQueryResult,
  VariableResultStatus,
  VariableScope,
  VariableSetResult,
  VariableSetter,
  VariableValueSetter,
} from "@tailjs/types";
import {
  AllRequired,
  assign2,
  delay,
  forEach2,
  formatError,
  map2,
  skip2,
  throwError,
} from "@tailjs/util";
import {
  AddSourceTrace,
  addSourceTrace,
  addTrace,
  AddTrace,
  ReadOnlyVariableStorage,
  toVariableResultPromise,
  traceSymbol,
  TrackerEnvironment,
  VariableOperationParameter,
  VariableSplitStorage,
  VariableStorage,
  WithCallbackIntellisense,
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
        ...copyKey(result),
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
  const expectedId = context.scope[target.scope];
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

export type VariableStorageCoordinatorQueryOptions = {
  context?: VariableStorageContext;
  options?: VariableQueryOptions;
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

  private _getVariable(
    scope: string,
    key: string,
    source?: string | null
  ): SchemaVariable | undefined {
    const types =
      this._storageTypeResolvers.get(getScopeSourceKey(scope, source)) ??
      this._types;
    return types.getVariable(scope, key, false);
  }

  public get<
    Getters extends VariableOperationParameter<
      VariableGetter & { value?: never; patch?: never },
      VariableScope,
      any
    >
  >(
    getters: WithCallbackIntellisense<Getters>,
    context?: VariableStorageContext
  ) {
    return toVariableResultPromise(getters, (keys) =>
      this._get(keys as any, context)
    );
  }

  public set<
    Setters extends VariableOperationParameter<
      VariableSetter,
      VariableScope,
      any
    >
  >(
    setters: WithCallbackIntellisense<Setters>,
    context?: VariableStorageContext
  ) {
    return toVariableResultPromise(setters, (setters) =>
      this._set(setters as any, context)
    );
  }

  private async _get(
    keys: VariableGetter[],
    context: VariableStorageContext = this._defaultContext
  ): Promise<VariableGetResult[]> {
    if (!keys.length) return [];

    type TraceData = [number, SchemaVariable, DataPurposeName | undefined];

    const results: VariableGetResult[] = [];
    let pendingGetters: AddSourceTrace<VariableGetter, TraceData>[] = [];

    let index = 0;
    for (const key of keys) {
      try {
        validateEntityId(key, context);
      } catch (error) {
        results[index++] = {
          status: VariableResultStatus.BadRequest,
          ...copyKey(key),
          error: formatError(error, this._settings.includeStackTraces),
        };
        continue;
      }

      const variable = this._getVariable(key.scope, key.key, key.source);
      if (variable) {
        const targetPurpose = key.purpose;

        pendingGetters.push(
          addSourceTrace(key, [index++, variable, targetPurpose])
        );
        continue;
      }
      results[index++] = {
        status: VariableResultStatus.BadRequest,
        ...copyKey(key),
        error: formatKey(key, "is not defined"),
      };
    }

    const pendingSetters: AddSourceTrace<VariableValueSetter, TraceData>[] = [];

    let retry = 0;
    while (pendingGetters.length && retry++ < this._errorRetries.attempts) {
      if (retry > 1) await retryDelay(this._errorRetries);

      for (let result of await this._storage.get(pendingGetters.splice(0))) {
        const [getter, [sourceIndex, variable, targetPurpose]] =
          result[traceSymbol];

        const validationContext = mapValidationContext(context, getter.purpose);
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
                ...copyKey(getter),
                error: formatValidationErrors(errors),
              };
            }
            pendingSetters.push(
              addSourceTrace(
                {
                  ...copyKey(getter),
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
              ...copyKey(getter),
              error: formatError(error, this._settings.includeStackTraces),
            };
          }
        }
      }
    }

    retry = 0;
    while (pendingSetters.length && retry++ < this._errorRetries.attempts) {
      if (retry > 1) await retryDelay(this._errorRetries);

      for (const result of await this._storage.set(pendingSetters.splice(0))) {
        const [setter, [sourceIndex, variable, targetPurpose]] =
          result[traceSymbol];

        const validationContext = mapValidationContext(context, targetPurpose);
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

    return results;
  }

  private async _set(
    keys: VariableSetter[],
    context: VariableStorageContext = this._defaultContext
  ): Promise<VariableSetResult[]> {
    const validationContext = mapValidationContext(context, undefined);

    if (!keys.length) return [];

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
    for (const key of keys) {
      try {
        validateEntityId(key, context);
      } catch (error) {
        results[index++] = {
          status: VariableResultStatus.BadRequest,
          ...copyKey(key),
          error: formatError(error, this._settings.includeStackTraces),
        };
        continue;
      }

      const variable = this._getVariable(key.scope, key.key, key.source);

      if (variable) {
        pendingSetters.push(
          addSourceTrace(key, [index++, variable, 0, undefined])
        );
        continue;
      }
      results[index++] = {
        status: VariableResultStatus.BadRequest,
        ...copyKey(key),
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
          .map((setter) => addTrace(copyKey(setter), setter[traceSymbol]))
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
              ...copyKey(setter),
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
              ...copyKey(setter),
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
            ...copyKey(setter),
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

    return results;
  }

  private async _queryOrPurge<R>(
    filters: VariableQuery[],
    action: (filter: VariableQuery[]) => Promise<R>,
    context: VariableStorageContext,
    intersect: boolean
  ): Promise<R> {
    const mapped: VariableQuery[] = [];
    for (const query of this._storage.splitSourceQueries(filters)) {
      if (context.scope && query.scope !== "global") {
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
      }

      let variableKeys: string[] = [];
      const resolver =
        this._storageTypeResolvers.get(
          getScopeSourceKey(query.scope, query.source)
        ) ?? this._types;

      if (query.classification || query.purposes) {
        forEach2(resolver.variables[query.scope], ([key, { type }]) => {
          const usage = type.usage;

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
            !testPurposes(usage.purposes, query.purposes, { intersect })
          ) {
            return;
          }

          variableKeys.push(key);
        });

        query.keys = query.keys
          ? (variableKeys = filterKeys(query.keys, variableKeys, () => {
              /* Don't cache this one*/
            }))
          : variableKeys;
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

  public purge(
    filters: VariableQuery[],
    context: VariableStorageContext = this._defaultContext
  ) {
    return this._queryOrPurge(
      filters,
      (filters) => this._storage.purge(filters),
      context,
      true
    );
  }

  public async query(
    filters: VariableQuery[],
    {
      context = this._defaultContext,
      options,
    }: VariableStorageCoordinatorQueryOptions = {}
  ): Promise<VariableQueryResult> {
    return await this._queryOrPurge(
      filters,
      async (filters) => {
        const result = await this._storage.query(filters, options);
        const consent = context.scope?.consent;
        if (consent) {
          const validationContext = mapValidationContext(context, undefined);
          result.variables = map2(result.variables, (variable) => {
            const variableType = this._storageTypeResolvers
              .get(getScopeSourceKey(variable.scope, variable.source))
              ?.getVariable(variable.scope, variable.key, false);
            const censored = variableType?.censor(
              variable.value,
              validationContext
            );
            return censored
              ? this._storageTypeResolvers.get(
                  getScopeSourceKey(variable.scope, variable.source)
                )
              : skip2;
          });
        }
        return result;
      },
      context,
      false
    );
  }

  public async initialize?(environment: TrackerEnvironment) {
    await this._storage.initialize(environment);
  }
}
