import {
  copyKey,
  dataClassification,
  DataPurposeName,
  DataUsage,
  filterKeys,
  filterRangeValue,
  formatKey,
  isErrorResult,
  isTransientError,
  isValueResult,
  testPurposes,
  Variable,
  VariableErrorResult,
  VariableGetResult,
  VariableGetter,
  VariableKey,
  VariableQuery,
  VariableScope,
  VariableSetResult,
  VariableSetter,
  VariableStatus,
  VariableValueSetter,
} from "@tailjs/types";
import { delay } from "@tailjs/util";
import {
  AddSourceTrace,
  addSourceTrace,
  addTrace,
  AddTrace,
  formatValidationErrors,
  ParsedSchemaType,
  ReadOnlyVariableStorage,
  SchemaValidationError,
  ScopedVariableGetResults,
  ScopedVariableGetters,
  ScopedVariableSetResults,
  ScopedVariableSetters,
  toVariableResultPromise,
  traceSymbol,
  TypeResolver,
  VariableSplitStorage,
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

export const normalizeStorageMappings = (
  mappings: VariableStorageMappings
): ({ scope: string; source: string } & StorageMappingEntry)[] => {
  const normalized: any[] = [];
  for (const scope in mappings) {
    const sources = mappings[scope];
    if ("get" in sources) {
      normalized.push({ scope, source: "", storage: sources });
    } else {
      for (const source in sources) {
        const sourceMapping = sources[source];
        if ("get" in sourceMapping) {
          normalized.push({ scope, source, storage: sourceMapping });
        } else {
          normalized.push({ scope, source, ...sourceMapping });
        }
      }
    }
  }
  return normalized;
};

export interface ConsentValidationSettings {
  /** Consider the security purpose different from "necessary". */
  security?: boolean;
  /** Consider the personalization purpose different from "functionality". */
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
  trusted?: boolean;
};

const MAX_PATCH_RETRIES = 10;
const MAX_ERROR_RETRIES = 3;

const censorResult = <Result extends VariableGetResult | VariableSetResult>(
  result: Result,
  type: ParsedSchemaType,
  context: VariableStorageContext,
  targetPurpose?: DataPurposeName
):
  | AddTrace<
      VariableKey & { status: VariableStatus.NotFound },
      Result extends { [traceSymbol]: infer Trace } ? Trace : undefined
    >
  | Result => {
  if (isValueResult(result)) {
    const consent = context.scope?.consent;
    if (
      (consent && targetPurpose && !consent.purposes[targetPurpose]) ||
      (result.value = type.censor((result as any).value, {
        trusted: !!context.trusted,
        consent,
      })) == undefined
    ) {
      return {
        status: VariableStatus.NotFound,
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
  | (VariableErrorResult & { status: VariableStatus.BadRequest })
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
    defaultContext: VariableStorageContext = { trusted: true }
  ) {
    this._storage = new VariableSplitStorage(mappings);
    this._defaultContext = defaultContext;
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
  ): ParsedSchemaType | undefined {
    const types =
      this._storageTypeResolvers.get(getScopeSourceKey(scope, source)) ??
      this._types;
    return types.getVariable(scope, key, false);
  }

  public get<Getters extends ScopedVariableGetters<VariableScope, any>>(
    keys: Getters,
    context?: VariableStorageContext
  ): ScopedVariableGetResults<Getters> {
    return toVariableResultPromise(this._get(keys as any, context)) as any;
  }

  public set<Setters extends ScopedVariableSetters<VariableScope, any>>(
    keys: Setters,
    context?: VariableStorageContext
  ): ScopedVariableSetResults<Setters> {
    return toVariableResultPromise(this._set(keys as any, context)) as any;
  }

  private async _get(
    keys: VariableGetter[],
    context: VariableStorageContext = this._defaultContext
  ): Promise<VariableGetResult[]> {
    if (!keys.length) return [];

    type TraceData = [number, ParsedSchemaType, DataPurposeName | undefined];

    const requireTargetPurpose = context.validation?.requireTargetPurpose;
    const results: VariableGetResult[] = [];
    let pendingGetters: AddSourceTrace<VariableGetter, TraceData>[] = [];

    let index = 0;
    for (const key of keys) {
      try {
        validateEntityId(key, context);
      } catch (error) {
        results[index++] = {
          status: VariableStatus.BadRequest,
          ...copyKey(key),
          error: error.message,
        };
        continue;
      }

      const type = this.getVariable(key.scope, key.key, key.source);
      if (type) {
        const targetPurpose = key.purpose;
        if (requireTargetPurpose && !targetPurpose) {
          throw new Error(
            "A target purpose is required when reading data. This can be turned off in the configuration setting `consentValidation.requestTargetPurpose`."
          );
        }

        pendingGetters.push(
          addSourceTrace(key, [index++, type, targetPurpose])
        );
        continue;
      }
      results[index++] = {
        status: VariableStatus.Unsupported,
        ...copyKey(key),
        error: formatKey(key, "is not defined"),
      };
    }

    const pendingSetters: AddSourceTrace<VariableValueSetter, TraceData>[] = [];

    let retry = 0;
    while (pendingGetters.length && retry++ < MAX_ERROR_RETRIES) {
      if (retry > 1) await delay(100);

      for (let result of await this._storage.get(pendingGetters.splice(0))) {
        const [getter, [sourceIndex, type, targetPurpose]] =
          result[traceSymbol];

        result = censorResult(result, type, context, targetPurpose);
        if (isValueResult((results[sourceIndex] = result))) {
          continue;
        } else if (isTransientError(result)) {
          pendingGetters.push(getter);
        } else if (result.status === VariableStatus.NotFound && getter.init) {
          try {
            let initValue = getter.init();
            if (!initValue) {
              continue;
            }
            let errors: SchemaValidationError[] = [];
            initValue = type.validate(
              initValue,
              undefined,
              { trusted: !!context.trusted },
              errors
            );
            if (errors.length) {
              results[sourceIndex] = {
                status: VariableStatus.BadRequest,
                ...copyKey(getter),
                error: formatValidationErrors(errors),
              };
            }
            pendingSetters.push(
              addSourceTrace(
                {
                  ...copyKey(getter),
                  ttl: getter.ttl,
                  value: initValue,
                },
                [sourceIndex, type, targetPurpose]
              )
            );
          } catch (e) {
            results[sourceIndex] = {
              status: VariableStatus.Error,
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
        const [setter, [sourceIndex, type, targetPurpose]] =
          result[traceSymbol];
        if (result.status === VariableStatus.Conflict) {
          if (result.current?.value) {
            results[sourceIndex] = censorResult(
              {
                status: VariableStatus.Success,
                ...result.current,
              },
              type,
              context,
              targetPurpose
            );
          } else {
            //
            pendingSetters.push(setter);
          }
        } else if (isValueResult(result) || isErrorResult(result)) {
          results[sourceIndex] = censorResult(result, type, context);
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
        type: ParsedSchemaType,
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
          status: VariableStatus.BadRequest,
          ...copyKey(key),
          error: error.message,
        };
        continue;
      }

      const type = this.getVariable(key.scope, key.key, key.source);
      if (type) {
        pendingSetters.push(addSourceTrace(key, [index++, type, 0, undefined]));
        continue;
      }
      results[index++] = {
        status: VariableStatus.Unsupported,
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
          .slice(0)
          .map((setter) => addTrace(copyKey(setter), setter[traceSymbol]))
      )) {
        const [setter, [sourceIndex, type]] = result[traceSymbol];

        if (isErrorResult(result)) {
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
        const current = (result[traceSymbol][1][3] = isValueResult(result)
          ? result
          : undefined);

        let next: any;
        try {
          const errors: SchemaValidationError[] = [];
          if (!("patch" in setter)) {
            if (setter.version !== current?.version) {
              // We already now this will be a conflict, so lets set the result already.
              results[sourceIndex] = {
                status: VariableStatus.Conflict,
                ...copyKey(setter),
                current: current?.value
                  ? type.censor(current?.value, {
                      trusted: !!context.trusted,
                      consent: context.scope?.consent,
                    }) ?? {}
                  : null,
              };
              continue;
            }
            next = type.validate(
              setter.value,
              current?.value,
              {
                trusted: !!context.trusted,
              },
              errors
            );
          } else {
            next = type.validate(
              setter.patch(
                type.censor(current?.value, { trusted: !!context.trusted })
              ),
              current?.value,
              { trusted: !!context.trusted },
              errors
            );
          }

          if (errors.length) {
            results[sourceIndex] = {
              status: VariableStatus.BadRequest,
              ...copyKey(setter),
              error: formatValidationErrors(errors),
            };
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
              setter[traceSymbol][1]
            )
          );
        } catch (e) {
          results[sourceIndex] = {
            status: VariableStatus.Error,
            ...copyKey(setter),
            error: e?.message || (e ? "" + e : "(unspecified error)"),
          };
        }
      }

      if (!valueSetters.length) {
        continue;
      }

      for (let result of await this._storage.set(valueSetters)) {
        const [setter, [sourceIndex, type]] = result[traceSymbol];
        if (
          result.status === VariableStatus.Conflict &&
          "patch" in setter &&
          retry < MAX_PATCH_RETRIES
        ) {
          // Reapply the patch.
          pendingSetters.push(setter);
          continue;
        }

        results[sourceIndex] = censorResult(result, type, context);
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
      const types =
        this._storageTypeResolvers.get(
          getScopeSourceKey(query.scope, query.source)
        ) ?? this._types;
      for (const variable of types.variables) {
        const usage = variable.type.usage;

        if (
          !filterRangeValue(
            usage.classification,
            query.classification,
            (classification) => dataClassification(classification, true)
          )
        ) {
          continue;
        }

        if (
          query.purposes &&
          !testPurposes(usage.purposes, query.purposes, intersect)
        ) {
          continue;
        }

        variableKeys.push(variable.key.key);
      }

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
}
