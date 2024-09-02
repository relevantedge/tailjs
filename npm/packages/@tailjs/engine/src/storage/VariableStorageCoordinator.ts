import {
  DataClassification,
  dataClassification,
  DataPurposeName,
  DataPurposes,
  DataUsage,
  formatKey,
  isErrorResult,
  isTransientError,
  isValueResult,
  Variable,
  VariableErrorResult,
  VariableGetResult,
  VariableGetterWithDefault,
  VariableKey,
  VariableQuery,
  VariableSetResult,
  VariableSetter,
  VariableStatus,
  VariableValueSetter,
} from "@tailjs/types";
import { delay, Nullish } from "@tailjs/util";
import {
  AddSourceTrace,
  addSourceTrace,
  addTrace,
  AddTrace,
  copyKey,
  ParsedSchemaType,
  traceSymbol,
  TypeResolver,
  VariableSplitStorage,
  VariableStorageMappings,
} from "..";
import { validateConsentPurposes } from "./validation";

export interface ConsentValidationOptions {
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
  };
  consent?: DataUsage;
  validation?: ConsentValidationOptions;
  trusted?: boolean;
};

const MAX_PATCH_RETRIES = 10;
const MAX_ERROR_RETRIES = 3;

/**
 * A variable query where minimum data usage can be specified.
 */
export interface VariableQueryWithUsage extends VariableQuery {
  minClassification?: DataClassification;
  maxClassification?: DataClassification;
  purposes?: DataPurposes;
}

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
    const censored = type.censor((result as any).value, context);
    if (censored == null) {
      return {
        status: VariableStatus.Denied,
        [traceSymbol]: result[traceSymbol],
        ...copyKey(result),
      } as any;
    }
  }
  return result;
};

const validateEntityId = <T extends VariableKey>(
  target: T,
  context: VariableStorageContext
): (VariableErrorResult & { status: VariableStatus.Invalid }) | undefined => {
  if (context.scope == null || target.scope === "global") {
    if (target.entityId == undefined) {
      return {
        status: VariableStatus.Invalid,
        ...copyKey(target),
        error: `Entity ID expected for ${formatKey(target)}`,
      };
    }
    return;
  }
  const expectedId = context.scope[target.scope];
  if (expectedId == undefined) {
    return {
      status: VariableStatus.Invalid,
      ...copyKey(target),
      error: `No ID is available for ${target.scope} scope in the current session.`,
    };
  }
  if (target.entityId && expectedId !== target.entityId) {
    return {
      status: VariableStatus.Invalid,
      ...copyKey(target),
      error: `The specified ID in ${target.scope} scope does not match that in the current session.`,
    };
  }
  target.entityId = expectedId;
};

export class VariableStorageCoordinator {
  private readonly _storage: VariableSplitStorage;
  private readonly _types: TypeResolver;
  constructor(mappings: VariableStorageMappings, types: TypeResolver) {
    this._storage = new VariableSplitStorage(mappings);
    this._types = types;
  }

  public async get(
    keys: VariableGetterWithDefault[],
    context: VariableStorageContext
  ): Promise<VariableGetResult[]> {
    if (!keys.length) return [];

    type TraceData = [number, ParsedSchemaType, DataPurposeName | undefined];

    const requireTargetPurpose = context.validation?.requireTargetPurpose;
    const results: VariableGetResult[] = [];
    let pendingGetters: AddSourceTrace<VariableGetterWithDefault, TraceData>[] =
      [];

    let index = 0;
    for (const key of keys) {
      const error = validateEntityId(key, context);
      if (error) {
        results[index++] = error;
        continue;
      }

      const type = this._types.getVariable(key.scope, key.key, false);
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
            let initValue = getter.init(getter);
            if (!initValue) {
              continue;
            }
            initValue = type.validate(initValue, undefined, context);
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

  public async set(
    keys: VariableSetter[],
    context: VariableStorageContext
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
      const error = validateEntityId(key, context);
      if (error) {
        results[index++] = error;
        continue;
      }

      const type = this._types.getVariable(key.scope, key.key, false);
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
          if (!("patch" in setter)) {
            if (setter.version !== current?.version) {
              // We already now this will be a conflict, so lets set the result already.
              results[sourceIndex] = {
                status: VariableStatus.Conflict,
                ...copyKey(setter),
                current: current?.value
                  ? type.censor(current?.value, context) ?? {}
                  : null,
              };
              continue;
            }
            next = type.validate(setter.value, current?.value, context);
          } else {
            next = type.validate(
              setter.patch(type.censor(current?.value, context)),
              current?.value,
              context
            );
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
            status: VariableStatus.Denied,
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

  private _dataUsageVariableKeyCache = new Map<string, string[]>();

  private async _queryOrPurge<R>(
    filters: VariableQueryWithUsage[],
    action: (filter: VariableQuery[]) => Promise<R>,
    context: VariableStorageContext
  ) {
    const mapped: VariableQuery[] = [];
    for (const filter of filters) {
      if (
        !filter.minClassification &&
        !filter.maxClassification &&
        !filter.purposes
      ) {
        mapped.push(filter);
        continue;
      }

      const cacheKey = [
        filter.scope,
        filter.minClassification,
        filter.maxClassification,
        Object.keys(filter.purposes ?? {}).join(","),
      ].join("|");
      let keys = this._dataUsageVariableKeyCache.get(cacheKey);
      if (!keys) {
        keys = [];
        for (const variable of this._types.variables) {
          const variableUsage = variable.type.usage;
          if (
            // Too small.
            (filter.minClassification &&
              dataClassification.compare(
                filter.minClassification,
                variableUsage?.classification ?? 1
              ) > 0) ||
            // Too big.
            (filter.maxClassification &&
              dataClassification.compare(
                filter.maxClassification,
                variableUsage?.classification ?? 1
              ) < 0) ||
            // Has purposes not in the filter.
            (filter.purposes &&
              !validateConsentPurposes(
                filter.purposes,
                variableUsage?.purposes,
                { ...context.validation, intersect: true }
              ))
          ) {
            continue;
          }
          keys.push(variable.key.key);
        }
        this._dataUsageVariableKeyCache.set(cacheKey, keys);
      }
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
    return mapped;
  }

  public purge(
    filters: VariableQueryWithUsage[],
    context: VariableStorageContext
  ) {
    return this._queryOrPurge(
      filters,
      (filters) => this._storage.purge(filters),
      context
    );
  }

  public query(
    filters: VariableQueryWithUsage[],
    context: VariableStorageContext
  ) {
    return this._queryOrPurge(
      filters,
      (filters) => this._storage.query(filters),
      context
    );
  }
}
