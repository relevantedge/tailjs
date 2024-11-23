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
  SchemaObjectType,
  SchemaVariable,
  SchemaValidationError,
  testPurposes,
  TypeResolver,
  Variable,
  VariableErrorResult,
  VariableGetResult,
  VariableGetter,
  VariableQuery,
  VariableResultStatus,
  VariableScope,
  VariableSetResult,
  VariableSetter,
  VariableValueSetter,
  ValidatableSchemaEntity,
} from "@tailjs/types";
import { delay, forEach2 } from "@tailjs/util";
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
  WithCallbackIntellisense,
} from "..";

type StorageMappingEntry = {
  storage: ReadOnlyVariableStorage;
  schemas?: string | string[];
};

export type VariableStorageMappings = {
  [P in VariableScope]?:
    | ReadOnlyVariableStorage
    | StorageMappingEntry
    | Record<string, ReadOnlyVariableStorage | StorageMappingEntry>;
};

const normalizeStorageMapping = (
  entry: ReadOnlyVariableStorage | StorageMappingEntry
): StorageMappingEntry => {
  return "get" in entry ? { storage: entry, schemas: "*" } : entry;
};

export const normalizeStorageMappings = (
  mappings: VariableStorageMappings
): ({ scope: string; source: string } & StorageMappingEntry)[] => {
  const normalized: any[] = [];
  for (const scope in mappings) {
    const sources = mappings[scope];
    if ("get" in sources || "storage" in sources) {
      normalized.push({
        scope,
        source: "",
        ...normalizeStorageMapping(sources),
      });
    } else {
      for (const source in sources) {
        normalized.push({
          scope,
          source,
          ...normalizeStorageMapping(sources[source]),
        });
      }
    }
  }
  return normalized;
};

export interface ConsentValidationSettings {
  /**
   * Consider the security purpose different from "necessary".
   * @default false
   */
  security?: boolean;

  /**
   * Consider the personalization purpose different from "functionality".
   * @default false
   */
  personalization?: boolean;

  /**
   * If this is configured and a get request does not explicitly specify a purpose, an error is thrown.
   *
   * @default false
   */
  requireTargetPurpose?: boolean;
}

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
  validation?: ConsentValidationSettings;
  /**
   * Whether restrictions on data access visibility applies.
   * @default false
   */
  trusted?: boolean;
};

const MAX_PATCH_RETRIES = 10;
const MAX_ERROR_RETRIES = 3;

const censorResult = <Result extends VariableGetResult | VariableSetResult>(
  result: Result,
  type: ValidatableSchemaEntity,
  context: VariableStorageContext,
  targetPurpose?: DataPurposeName
): Result => {
  if ("value" in result && result.value != null) {
    const consent = context.scope?.consent;
    if (
      (consent && targetPurpose && !consent.purposes[targetPurpose]) ||
      (result.value = type.censor((result as any).value, {
        trusted: !!context.trusted,
        consent,
      })) == undefined
    ) {
      return {
        status: VariableResultStatus.NotFound,
        [traceSymbol]: result[traceSymbol],
        ...copyKey(result),
      } as any;
    }
  }
  return result;
};

const validateEntityId = (
  target: { scope: string; entityId?: string },
  context: VariableStorageContext
):
  | (VariableErrorResult & { status: VariableResultStatus.BadRequest })
  | undefined => {
  if (context.scope == null || target.scope === "global") {
    if (target.entityId == undefined) {
      throw new Error(
        `An entity ID for ${target.scope} scope is required in this context.`
      );
    }
    return;
  }
  const expectedId = context.scope[target.scope];
  if (expectedId == undefined) {
    throw new Error(
      "`No ID is available for ${target.scope} scope in the current session.`"
    );
  }
  if (target.entityId && expectedId !== target.entityId) {
    throw new Error(
      `The specified ID in ${target.scope} scope does not match that in the current session.`
    );
  }
  target.entityId = expectedId;
};

const getScopeSourceKey = (scope: string, source?: string) =>
  source ? scope + "|" + source : scope;

export class VariableStorageCoordinator {
  private readonly _storage: VariableSplitStorage;
  private readonly _types: TypeResolver;
  private readonly _storageTypeResolvers = new Map<string, TypeResolver>();
  private readonly _defaultContext: VariableStorageContext;

  constructor(
    mappings: VariableStorageMappings,
    types: TypeResolver,
    defaultContext: VariableStorageContext = { trusted: false }
  ) {
    this._storage = new VariableSplitStorage(mappings);
    this._defaultContext = defaultContext;
    this._types = types;
    for (const { source, scope, schemas } of normalizeStorageMappings(
      mappings
    )) {
      if (!schemas) {
        continue;
      }
      this._storageTypeResolvers.set(
        getScopeSourceKey(scope, source),
        this._types.subset(schemas)
      );
    }
    this._types = types;
  }

  private getVariable(
    scope: string,
    key: string,
    source?: string
  ): SchemaVariable | undefined {
    const types =
      this._storageTypeResolvers.get(getScopeSourceKey(scope, source)) ??
      this._types;
    return types.getVariable(scope, key, false);
  }

  public get<
    Getters extends VariableOperationParameter<
      VariableGetter,
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

    const requireTargetPurpose = context.validation?.requireTargetPurpose;
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
          error: error.message,
        };
        continue;
      }

      const variable = this.getVariable(key.scope, key.key, key.source);
      if (variable) {
        const targetPurpose = key.purpose;
        if (requireTargetPurpose && !targetPurpose) {
          throw new Error(
            "A target purpose is required when reading data. This can be turned off in the configuration setting `consentValidation.requestTargetPurpose`."
          );
        }

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
    while (pendingGetters.length && retry++ < MAX_ERROR_RETRIES) {
      if (retry > 1) await delay(100);

      for (let result of await this._storage.get(pendingGetters.splice(0))) {
        const [getter, [sourceIndex, variable, targetPurpose]] =
          result[traceSymbol];

        result = censorResult(result, variable, context, targetPurpose);
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
              { trusted: !!context.trusted },
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
          } catch (e) {
            results[sourceIndex] = {
              status: VariableResultStatus.Error,
              ...copyKey(getter),
              error: e + "",
            };
          }
        }
      }
    }

    retry = 0;
    while (pendingSetters.length && retry++ < MAX_ERROR_RETRIES) {
      if (retry > 1) await delay(100);

      for (const result of await this._storage.set(pendingSetters.splice(0))) {
        const [setter, [sourceIndex, variable, targetPurpose]] =
          result[traceSymbol];

        if (result.status === VariableResultStatus.Conflict) {
          if (result.current?.value) {
            results[sourceIndex] = censorResult(
              {
                status: VariableResultStatus.Success,
                ...result.current,
              },
              variable,
              context,
              targetPurpose
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
          results[sourceIndex] = censorResult(result, variable, context) as any;
        }
      }
    }

    return results;
  }

  private async _set(
    keys: VariableSetter[],
    context: VariableStorageContext = this._defaultContext
  ): Promise<VariableSetResult[]> {
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
          error: error.message,
        };
        continue;
      }

      const variable = this.getVariable(key.scope, key.key, key.source);
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
    while (pendingSetters.length && retry++ <= MAX_PATCH_RETRIES) {
      if (retry > 1) {
        // Add random delay in the hope that we resolve conflict races.
        await delay(100 + 50 * Math.random());
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
            result[traceSymbol][1][2]++ < MAX_ERROR_RETRIES
          ) {
            pendingSetters.push(setter);
          }
          continue;
        }
        const current = (result[traceSymbol][1][3] =
          "version" in result ? result : undefined);

        let next: any;
        try {
          const errors: SchemaValidationError[] = [];
          if (!("patch" in setter)) {
            if (setter.version !== current?.version) {
              // We already now this will be a conflict, so lets set the result already.
              results[sourceIndex] = {
                status: VariableResultStatus.Conflict,
                ...copyKey(setter),
                current: current?.value
                  ? variable.censor(current?.value, {
                      trusted: !!context.trusted,
                      consent: context.scope?.consent,
                    }) ?? {}
                  : null,
              };
              continue;
            }
            next = variable.validate(
              setter.value,
              current?.value,
              {
                trusted: !!context.trusted,
              },
              errors
            );
          } else {
            next = variable.validate(
              setter.patch(
                variable.censor(current?.value, { trusted: !!context.trusted })
              ),
              current?.value,
              { trusted: !!context.trusted },
              errors
            );
          }

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

          // Convert to value setter.
          valueSetters.push(
            addTrace(
              {
                ...setter,
                patch: undefined,
                version: current?.version,
                value: next,
              },
              // Reuse original setter data, so we know what to do if retried.
              setter[traceSymbol]
            )
          );
        } catch (e) {
          results[sourceIndex] = {
            status: VariableResultStatus.Error,
            ...copyKey(setter),
            error: e?.message || (e ? "" + e : "(unspecified error)"),
          };
        }
      }

      if (!valueSetters.length) {
        continue;
      }

      for (let result of await this._storage.set(valueSetters)) {
        const [setter, [sourceIndex, variable]] = result[traceSymbol];
        if (
          result.status === VariableResultStatus.Conflict &&
          "patch" in setter &&
          retry < MAX_PATCH_RETRIES
        ) {
          // Reapply the patch.
          pendingSetters.push(setter);
          continue;
        }

        results[sourceIndex] = censorResult(result, variable, context);
      }
    }

    return results;
  }

  private async _queryOrPurge<R>(
    filters: VariableQuery[],
    action: (filter: VariableQuery[]) => Promise<R>,
    context: VariableStorageContext,
    intersect: boolean
  ) {
    const mapped: VariableQuery[] = [];
    for (const query of this._storage.splitSourceQueries(filters)) {
      validateEntityId(query, context);

      const variableKeys: string[] = [];
      const resolver =
        this._storageTypeResolvers.get(
          getScopeSourceKey(query.scope, query.source)
        ) ?? this._types;
      forEach2(resolver.variables, ([, variables]) =>
        forEach2(variables, ([key, { type }]) => {
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
            !testPurposes(usage.purposes, query.purposes, intersect)
          ) {
            return;
          }

          variableKeys.push(key);
        })
      );

      query.keys = query.keys
        ? filterKeys(query.keys, variableKeys, () => {
            /* Don't cache this one*/
          })
        : variableKeys;
    }

    let retry = 0;
    while (retry++ < MAX_ERROR_RETRIES) {
      try {
        return await action(mapped);
      } catch (e) {
        if (retry === MAX_ERROR_RETRIES || !isTransientErrorObject(e)) {
          throw e;
        }
        await delay(100);
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

  public query(
    filters: VariableQuery[],
    context: VariableStorageContext = this._defaultContext
  ): Promise<Variable<any>[]> {
    return this._queryOrPurge(
      filters,
      (filters) => this._storage.query(filters),
      context,
      false
    );
  }

  public async initialize?(environment: TrackerEnvironment) {
    await this._storage.initialize(environment);
  }
}
