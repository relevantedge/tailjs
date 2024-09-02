import {
  DataUsage,
  formatKey,
  isErrorResult,
  isTransientError,
  isValueResult,
  SchemaType,
  Variable,
  VariableErrorResult,
  VariableGetResult,
  VariableGetterWithDefault,
  VariableKey,
  VariableSetResult,
  VariableSetter,
  VariableStatus,
  VariableValueSetter,
} from "@tailjs/types";
import { AllRequired, delay } from "@tailjs/util";
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
  WithTrace,
} from "..";

export type VariableStorageContext = {
  /** The current entity IDs for session and user scope. */
  scope?: {
    sessionId?: string;
    deviceId?: string;
    userId?: string;
  };
  consent?: DataUsage;
  defaultConsent?: AllRequired<DataUsage>;
  trusted?: boolean;
};

const censorResult = <
  Result extends WithTrace<VariableGetResult | VariableSetResult, Trace>,
  Trace
>(
  result: Result,
  type: ParsedSchemaType,
  context: VariableStorageContext
):
  | AddTrace<VariableKey & { status: VariableStatus.NotFound }, Trace>
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

    const results: VariableGetResult[] = [];
    let pendingGetters: AddSourceTrace<
      VariableGetterWithDefault,
      [number, ParsedSchemaType]
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
        pendingGetters.push(addSourceTrace(key, [index++, type]));
        continue;
      }
      results[index++] = {
        status: VariableStatus.Unsupported,
        ...copyKey(key),
        error: formatKey(key, "is not defined"),
      };
    }

    const pendingSetters: AddSourceTrace<
      VariableValueSetter,
      [number, ParsedSchemaType]
    >[] = [];

    let retry = 0;
    while (pendingGetters.length && retry++ < 3) {
      if (retry > 1) await delay(100);

      for (let result of await this._storage.get(pendingGetters.splice(0))) {
        const [getter, [sourceIndex, type]] = result[traceSymbol];
        result = censorResult(result, type, context);
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
                [sourceIndex, type]
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
    while (pendingSetters.length && retry++ < 3) {
      if (retry > 1) await delay(100);

      for (const result of await this._storage.set(pendingSetters.splice(0))) {
        const [setter, [sourceIndex, type]] = result[traceSymbol];
        if (result.status === VariableStatus.Conflict) {
          if (result.current?.value) {
            results[sourceIndex] = censorResult(
              {
                status: VariableStatus.Success,
                ...result.current,
              },
              type,
              context
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
    while (pendingSetters.length && retry++ <= 10) {
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
          if (isTransientError(result) && result[traceSymbol][1][2]++ < 3) {
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

      for (const result of await this._storage.set(valueSetters)) {
        const [setter, [sourceIndex, type]] = result[traceSymbol];
        if (isValueResult((results[sourceIndex] = result))) {
          results[sourceIndex].value = type.censor(
            results[sourceIndex].value,
            context
          );
        } else if (
          result.status === VariableStatus.Conflict &&
          "patch" in setter
        ) {
          // Reapply the patch.
          pendingSetters.push(setter);
        }
      }
    }

    return results;
  }
}

// import { CONSENT_INFO_KEY } from "@constants";

// import {
//   SchemaClassification,
//   SchemaManager,
//   SchemaVariableSet,
// } from "@tailjs/json-schema";
// import {
//   DataClassification,
//   DataPurposeFlags,
//   ParsableConsent,
//   UserConsent,
//   ValidatedVariableGetter,
//   ValidatedVariableSetter,
//   Variable,
//   VariableFilter,
//   VariableGetError,
//   VariableGetResult,
//   VariableGetResults,
//   VariableGetters,
//   VariableHeader,
//   VariableKey,
//   VariableMetadata,
//   VariablePatch,
//   VariableQueryOptions,
//   VariableQueryResult,
//   VariableResultStatus,
//   VariableScope,
//   VariableScopeValue,
//   VariableSetResult,
//   VariableSetResults,
//   VariableSetters,
//   VariableUsage,
//   dataClassification,
//   dataPurposes,
//   extractKey,
//   formatKey,
//   getResultVariable,
//   isSuccessResult,
//   isVariablePatchAction,
//   parseKey,
//   stripPrefix,
//   validateConsent,
//   variableScope,
// } from "@tailjs/types";
// import {
//   MaybeArray,
//   MaybePromise,
//   MaybeUndefined,
//   Nullish,
//   PartialRecord,
//   TupleMap,
//   delay,
//   forEach,
//   ifDefined,
//   now,
//   required,
//   tryCatch,
//   unwrap,
//   waitAll,
//   wrap,
// } from "@tailjs/util";
// import {
//   ReadonlyVariableStorage,
//   SplitStorageErrorWrapper,
//   VariableSplitStorage,
//   VariableStorage,
//   VariableStorageContext,
// } from "..";
// import {
//   PartitionItem,
//   applyPatch,
//   partitionItems,
//   withSourceIndex,
// } from "../lib";

// export type SchemaBoundPrefixMapping = {
//   storage: ReadonlyVariableStorage;

//   /**
//    * The IDs of the schemas.
//    */
//   schema?: MaybeArray<string>;
//   /**
//    * If a variable's classification is not explicitly defined in a schema, this will be the default.
//    * If omitted, set requests will fail unless classification and purpose is defined.
//    */
//   classification?: Partial<VariableUsage>;
// };

// export interface VariableStorageCoordinatorSettings {
//   mappings: PartialRecord<
//     VariableScopeValue | "default",
//     | SchemaBoundPrefixMapping
//     | Record<string, SchemaBoundPrefixMapping>
//     | undefined
//   >;
//   schema: SchemaManager;
//   consent?: UserConsent;
//   retries?: number;
//   transientRetryDelay?: number;
//   errorRetryDelay?: number;
// }

// type PrefixVariableMapping = {
//   variables: SchemaVariableSet | undefined;
//   classification?: Partial<SchemaClassification>;
// };

// export class VariableStorageCoordinator implements VariableStorage {
//   private _settings: Required<
//     Omit<VariableStorageCoordinatorSettings, "schema" | "consent">
//   >;

//   private readonly _variables = new TupleMap<
//     [scope: VariableScope, prefix: string],
//     PrefixVariableMapping
//   >();

//   private readonly _storage: VariableSplitStorage;

//   constructor({
//     mappings,
//     schema,
//     retries = 3,
//     transientRetryDelay = 50,
//     errorRetryDelay = 250,
//   }: VariableStorageCoordinatorSettings) {
//     const normalizeMappings = (
//       mappings:
//         | SchemaBoundPrefixMapping
//         | Record<string, SchemaBoundPrefixMapping>
//     ): Record<string, SchemaBoundPrefixMapping> =>
//       (mappings as SchemaBoundPrefixMapping)?.storage
//         ? { "": mappings as SchemaBoundPrefixMapping }
//         : (mappings as Record<string, SchemaBoundPrefixMapping>);

//     const defaultMapping =
//       mappings.default && normalizeMappings(mappings.default);
//     const normalizedMappings: Record<
//       VariableScopeValue<true>,
//       Record<string, SchemaBoundPrefixMapping>
//     > = {} as any;
//     forEach(
//       mappings,
//       ([scope, mappings]) =>
//         scope !== "default" &&
//         mappings &&
//         (normalizedMappings[variableScope(scope)] = normalizeMappings(mappings))
//     );

//     defaultMapping &&
//       forEach(
//         variableScope.values,
//         (scope) =>
//           !normalizedMappings[scope] &&
//           (normalizedMappings[scope] = defaultMapping)
//       );

//     this._storage = new VariableSplitStorage(normalizedMappings, {
//       get: (storage, getters, results, context) =>
//         this._patchGetResults(storage, getters, results, context),
//       set: (storage, setters, results, context) =>
//         this._patchSetResults(storage, setters, results, context),
//     });

//     this._settings = {
//       mappings,
//       retries,
//       transientRetryDelay,
//       errorRetryDelay,
//     };

//     forEach(variableScope.values, (scope) =>
//       forEach(normalizedMappings[scope], ([prefix, mapping]) =>
//         this._variables.set([scope, prefix], {
//           variables: ifDefined(mapping.schema, (schemas) =>
//             schema.compileVariableSet(schemas)
//           ),
//           classification: mapping.classification,
//         })
//       )
//     );
//   }

//   private async _setWithRetry(
//     setters: (ValidatedVariableSetter | Nullish)[],
//     targetStorage: VariableStorage | SplitStorageErrorWrapper,
//     context: VariableStorageContext | undefined,
//     patch?: (
//       sourceIndex: number,
//       result: VariableSetResult
//     ) => MaybePromise<ValidatedVariableSetter | undefined>
//   ): Promise<(VariableSetResult | undefined)[]> {
//     const finalResults: (VariableSetResult | undefined)[] = [];
//     let pending = withSourceIndex(
//       setters.map((source, i) => {
//         const scopeError = this._applyScopeId(source, context);
//         if (scopeError) {
//           finalResults[i] = {
//             status: VariableResultStatus.Denied,
//             error: scopeError,
//             source: source!,
//           };
//           return undefined;
//         }
//         return source;
//       })
//     );

//     const retries = this._settings.retries;
//     for (let i = 0; pending.length && i <= retries; i++) {
//       const current = pending;
//       let retryDelay = this._settings.transientRetryDelay;
//       pending = [];
//       try {
//         const results = await targetStorage.set(
//           partitionItems(current),
//           context as any
//         );

//         await waitAll(
//           ...results.map(async (result, j) => {
//             finalResults[j] = result;

//             if (
//               result.status === VariableResultStatus.Error &&
//               result.transient
//             ) {
//               pending.push(current[j]);
//             } else if (
//               result.status === VariableResultStatus.Conflict &&
//               patch
//             ) {
//               const patched = await patch(j, result);
//               patched && pending.push([j, patched]);
//             }
//           })
//         );
//       } catch (e) {
//         retryDelay = this._settings.errorRetryDelay;
//         current.map(
//           ([index, source]) =>
//             source &&
//             (finalResults[index] = {
//               status: VariableResultStatus.Error as const,
//               error: `Operation did not complete after ${retries} attempts. ${e}`,
//               source: source,
//             })
//         );
//         pending = current;
//       }

//       if (pending.length) {
//         await delay((0.8 + 0.2 * Math.random()) * retryDelay * (i + 1));
//       }
//     }

//     // Map original sources (lest something was patched).
//     finalResults.forEach((result, i) => {
//       if (
//         context?.tracker &&
//         result?.status! <= 201 &&
//         result?.current?.scope === VariableScope.Device
//       ) {
//         context.tracker._touchClientDeviceData();
//       }
//       return result && (result.source = setters[i]!);
//     });

//     return finalResults;
//   }

//   protected async _patchGetResults(
//     storage: SplitStorageErrorWrapper,
//     getters: (ValidatedVariableGetter | Nullish)[],
//     results: (VariableGetResult<any, string> | undefined)[],
//     context: VariableStorageContext | undefined
//   ): Promise<(VariableGetResult | undefined)[]> {
//     const initializerSetters: ValidatedVariableSetter[] = [];

//     for (let i = 0; i < getters.length; i++) {
//       if (!getters[i]) continue;

//       const getter = getters[i]!;
//       if (
//         !getter.init ||
//         results[i]?.status !== VariableResultStatus.NotFound
//       ) {
//         continue;
//       }
//       if (!storage.writable) {
//         throw new Error(
//           `A getter with an initializer was specified for a non-writable storage.`
//         );
//       }

//       const initialValue = await unwrap(getter.init);
//       if (initialValue == null) {
//         continue;
//       }
//       initializerSetters.push({ ...getter, ...initialValue });
//     }

//     if (storage.writable && initializerSetters.length > 0) {
//       await this._setWithRetry(initializerSetters, storage, context);
//     }
//     return results;
//   }

//   private async _patchSetResults(
//     storage: SplitStorageErrorWrapper,
//     setters: (ValidatedVariableSetter | Nullish)[],
//     results: (VariableSetResult | undefined)[],
//     context: VariableStorageContext | undefined
//   ): Promise<(VariableSetResult | undefined)[]> {
//     const patches: PartitionItem<VariablePatch<any, true>>[] = [];

//     let setter: ValidatedVariableSetter | undefined;
//     results.forEach(
//       (result, i) =>
//         result?.status === VariableResultStatus.Unsupported &&
//         (setter = setters[i]!).patch != null &&
//         patches.push([i, setter])
//     );

//     if (patches.length) {
//       const patch = async (
//         patchIndex: number,
//         result: VariableGetResult | VariableSetResult | undefined
//       ): Promise<ValidatedVariableSetter | undefined> => {
//         const [sourceIndex, patch] = patches[patchIndex];
//         if (!setters[sourceIndex]) return undefined;

//         if (result?.status === VariableResultStatus.Error) {
//           results[sourceIndex] = {
//             status: VariableResultStatus.Error,
//             error: result.error,
//             source: setters[sourceIndex]!,
//           };
//           return undefined;
//         }
//         const current = getResultVariable(result);

//         const patched = await applyPatch(current, patch);
//         if (!patched) {
//           results[sourceIndex] = {
//             status: VariableResultStatus.Unchanged,
//             current,
//             source: setters[sourceIndex]!,
//           };
//         }
//         return patched
//           ? {
//               ...setters[sourceIndex]!,
//               ...current,
//               patch: undefined,
//               ...patched,
//             }
//           : undefined;
//       };

//       const patchSetters: PartitionItem<ValidatedVariableSetter | Nullish>[] =
//         [];
//       const currentValues = await storage.get(
//         partitionItems(patches),
//         context as any
//       );

//       for (let i = 0; i < patches.length; i++) {
//         const patched = await patch(i, currentValues[i]);
//         if (patched) {
//           patchSetters.push([i, patched]);
//         }
//       }

//       if (patchSetters.length > 0) {
//         (
//           await this._setWithRetry(
//             partitionItems(patchSetters),
//             storage,
//             context,
//             (sourceIndex, result) =>
//               result.status === VariableResultStatus.Conflict
//                 ? patch(patchSetters[sourceIndex][0], result)
//                 : undefined
//           )
//         ).forEach((result, i) => {
//           // Map setter to patch to source.
//           const sourceIndex = patches[patchSetters[i][0]][0];
//           result && (result.source = setters[sourceIndex]!);
//           results[sourceIndex] = result;
//         });
//       }
//     }
//     return results;
//   }

//   private _patchAndCensor<
//     T extends (VariableKey & Partial<VariableUsage>) | undefined,
//     V
//   >(
//     mapping: PrefixVariableMapping,
//     key: T,
//     value: V,
//     consent: ParsableConsent | undefined,
//     write: boolean
//   ): MaybeUndefined<T, V> {
//     if (key == null || value == null) return undefined as any;

//     const localKey = stripPrefix(key)!;
//     if (mapping.variables?.has(localKey)) {
//       return mapping.variables.patch(
//         localKey,
//         value,
//         consent,
//         false,
//         write
//       ) as any;
//     }

//     return !consent ||
//       validateConsent(localKey, consent, mapping.classification)
//       ? (value as any)
//       : undefined;
//   }

//   private _getMapping({ scope, key }: { scope: VariableScope; key: string }) {
//     const prefix = parseKey(key).prefix;
//     return required(
//       this._variables.get([scope, prefix]),
//       () =>
//         `No storage provider is mapped to the prefix '${prefix}' in ${variableScope.format(
//           scope
//         )}`
//     );
//   }

//   private _validate<
//     T extends Partial<VariableUsage & VariableMetadata> | undefined
//   >(
//     mapping: PrefixVariableMapping,
//     target: T,
//     key: VariableKey & Partial<VariableUsage>,
//     value: any
//   ): T {
//     if (!target) return target;

//     const definition = mapping.variables?.get(stripPrefix(key));
//     if (definition) {
//       target.classification = definition.classification;
//       target.purposes = definition.purposes;
//     } else {
//       target.classification ??=
//         key?.classification ?? mapping.classification?.classification;
//       target.purposes ??=
//         key?.purposes ??
//         (key as any)?.purpose /* getters */ ??
//         mapping.classification?.purposes;
//     }
//     required(
//       target.classification,
//       () =>
//         `The variable ${formatKey(
//           key
//         )} must have an explicit classification since it is not defined in a schema, and its storage does not have a default classification.`
//     );
//     required(
//       target.purposes,
//       () =>
//         `The variable ${formatKey(
//           key
//         )} must have explicit purposes since it is not defined in a schema, and its storage does not have a default classification.`
//     );

//     value != null && definition?.validate(value);

//     return target;
//   }

//   private _applyScopeId(
//     key: VariableKey | Nullish,
//     context: VariableStorageContext | Nullish
//   ) {
//     if (key) {
//       const scope = variableScope(key.scope);
//       const scopeIds = context?.tracker ?? context?.scopeIds;

//       if (scopeIds) {
//         const validateScope = (
//           expectedTarget: string | undefined,
//           actualTarget: string | undefined
//         ) => {
//           if (!actualTarget) {
//             return scope === VariableScope.Session
//               ? "The tracker does not have an associated session."
//               : scope === VariableScope.Device
//               ? "The tracker does not have associated device data, most likely due to the lack of consent."
//               : "The tracker does not have an authenticated user associated.";
//           }
//           if (expectedTarget !== actualTarget) {
//             return `If a target ID is explicitly specified for the ${variableScope.format(
//               scope
//             )} scope it must match the tracker. (Specifying the target ID for this scope is optional.)`;
//           }
//           return undefined;
//         };

//         const error =
//           scope === VariableScope.Session
//             ? validateScope(
//                 scopeIds.sessionId,
//                 (key.entityId ??= scopeIds.sessionId)
//               )
//             : scope === VariableScope.Device
//             ? validateScope(
//                 scopeIds.deviceId,
//                 (key.entityId ??= scopeIds.deviceId)
//               )
//             : scope === VariableScope.User
//             ? validateScope(
//                 scopeIds.authenticatedUserId,
//                 (key.entityId ??= scopeIds.authenticatedUserId)
//               )
//             : undefined;

//         return error;
//       } else if (scope !== VariableScope.Global && !key.entityId) {
//         return `Target ID is required for non-global scopes when variables are not managed through the tracker.`;
//       }
//     }

//     return undefined;
//   }

//   _restrictFilters(
//     filters: VariableFilter<true>[],
//     context?: VariableStorageContext
//   ) {
//     const scopeIds = context?.tracker ?? context?.scopeIds;
//     if (!scopeIds) {
//       return filters;
//     }
//     const scopeTargetedFilters: VariableFilter<true>[] = [];
//     for (const filter of filters) {
//       for (let scope of filter.scopes ?? variableScope.values) {
//         scope = variableScope(scope);

//         let scopeTargetId =
//           scope === VariableScope.User
//             ? scopeIds.authenticatedUserId
//             : scope === VariableScope.Device
//             ? scopeIds.deviceId
//             : scope === VariableScope.Session
//             ? scopeIds.sessionId
//             : true;
//         if (!scopeTargetId) {
//           continue;
//         }
//         scopeTargetedFilters.push({
//           ...filter,
//           scopes: [scope],
//           targetIds:
//             scopeTargetId === true ? filter.targetIds : [scopeTargetId],
//         });
//       }
//     }

//     return scopeTargetedFilters;
//   }

//   private _censorValidate(
//     mapping: PrefixVariableMapping,
//     target: Partial<VariableUsage> & { value: any },
//     key: VariableKey & Partial<VariableUsage>,
//     index: number,
//     variables: readonly any[],
//     censored: [index: number, result: VariableSetResult][],
//     consent: ParsableConsent | undefined,
//     context: VariableStorageContext | undefined,
//     write: boolean
//   ) {
//     let error = this._applyScopeId(key, context);
//     if (error) {
//       censored.push([
//         index,
//         { source: key as any, status: VariableResultStatus.Denied, error },
//       ]);
//       return false;
//     }

//     if (target.value == null) {
//       return true;
//     }
//     if (
//       tryCatch(
//         () => (this._validate(mapping, target as any, key, target.value), true),
//         (error) => (
//           ((variables[index] as any) = undefined),
//           censored.push([
//             index,
//             {
//               source: key as any,
//               status: VariableResultStatus.Invalid,
//               error,
//             },
//           ]),
//           false
//         )
//       )
//     ) {
//       const wasDefined = target.value != null;

//       target.value = this._patchAndCensor(
//         mapping,
//         { ...key, ...target },
//         target.value,
//         consent,
//         write
//       );
//       if (wasDefined && target.value == null) {
//         (variables[index] as any) = undefined;
//         censored.push([
//           index,
//           { source: key as any, status: VariableResultStatus.Denied },
//         ]);
//       } else {
//         return true;
//       }
//     }
//     return false;
//   }

//   private _getContextConsent = (
//     context: VariableStorageContext | undefined
//   ) => {
//     let consent = context?.tracker?.consent;
//     if (!consent && (consent = context?.consent as any)) {
//       consent = {
//         level: dataClassification(consent.level),
//         purposes: dataPurposes(consent.purposes),
//       };
//     }
//     if (!consent) return consent;

//     consent = { ...consent };
//     if (!context?.client) {
//       consent.purposes |= DataPurposeFlags.Server;
//     }

//     return consent;
//   };
//   async get<K extends VariableGetters<true>>(
//     keys: VariableGetters<true, K>,
//     context?: VariableStorageContext
//   ): Promise<VariableGetResults<K>> {
//     const censored: [index: number, result: VariableSetResult][] = [];
//     const consent = this._getContextConsent(context);

//     let timestamp: number | undefined;

//     keys = keys.map((getter, index) => {
//       if (!getter) return undefined;

//       const error = this._applyScopeId(getter as any, context);
//       if (error) {
//         censored.push([
//           index,
//           {
//             source: getter,
//             status: VariableResultStatus.Denied,
//             error,
//           } as any,
//         ]);
//         return undefined;
//       }

//       if (getter.key === CONSENT_INFO_KEY) {
//         // TODO: Generalize and refactor so it is not hard-coded here.
//         censored.push([
//           index,
//           getter.scope !== VariableScope.Session || !consent
//             ? {
//                 source: getter as any,
//                 status: VariableResultStatus.NotFound,
//                 error: `The reserved variable ${CONSENT_INFO_KEY} is only available in session scope, and only if requested from tracking context.`,
//               }
//             : {
//                 source: getter as any,
//                 status: VariableResultStatus.Success,
//                 current: {
//                   key: CONSENT_INFO_KEY,
//                   scope: VariableScope.Session,
//                   classification: DataClassification.Anonymous,
//                   purposes: DataPurposeFlags.Necessary,
//                   created: (timestamp ??= now()),
//                   modified: timestamp,
//                   accessed: timestamp,
//                   version: "",
//                   value: {
//                     level: dataClassification.lookup(consent.level),
//                     purposes: dataPurposes.lookup(consent.purposes),
//                   },
//                 },
//               },
//         ]);

//         return undefined;
//       }

//       if (getter.init) {
//         const mapping = this._getMapping(getter);
//         (getter as ValidatedVariableGetter).init = wrap(
//           getter.init,
//           async (original) => {
//             const result = await original();
//             return result?.value != null &&
//               this._censorValidate(
//                 mapping,
//                 result!,
//                 getter,
//                 index,
//                 keys,
//                 censored,
//                 consent,
//                 context,
//                 true
//               )
//               ? result
//               : undefined;
//           }
//         );
//       }
//       return getter;
//     });

//     let expired: Variable[] | undefined;

//     const results = (await this._storage.get(keys as any, context as any)).map(
//       (variable) => {
//         if (
//           isSuccessResult(variable, true) &&
//           variable.accessed! + variable.ttl! < (timestamp ??= now())
//         ) {
//           (expired ??= []).push(variable);
//           return {
//             ...extractKey(variable),
//             status: VariableResultStatus.NotFound,
//           };
//         }
//         return variable;
//       }
//     );

//     if (expired?.length) {
//       // Delete expired variables on read.
//       await this._storage.set(
//         expired.map((variable) => ({ ...variable, value: undefined })),
//         context
//       );
//     }

//     for (const [i, result] of censored) {
//       (results as VariableGetError[])[i] = {
//         ...extractKey(result.source, result.current ?? result.source),
//         value: result.current?.value,
//         status: result.status as any,
//         error: (result as any).error,
//       };
//     }

//     for (const result of results) {
//       if (!isSuccessResult(result, true) || !result?.value) continue;
//       const mapping = this._getMapping(result);
//       if (mapping) {
//         if (
//           (result.value = this._patchAndCensor(
//             mapping,
//             result,
//             result.value,
//             consent,
//             false
//           )) == null
//         ) {
//           result.status = VariableResultStatus.Denied as any;
//         }
//       }
//     }

//     return results as any;
//   }

//   async set<K extends VariableSetters<true>>(
//     variables: VariableSetters<true, K>,
//     context?: VariableStorageContext
//   ): Promise<VariableSetResults<K>> {
//     const censored: [index: number, result: VariableSetResult][] = [];
//     const consent = this._getContextConsent(context);

//     // Censor the values (including patch actions) when the context has a tracker.
//     variables.forEach((setter, i) => {
//       if (!setter) return;

//       if (setter.key === CONSENT_INFO_KEY) {
//         censored.push([
//           i,
//           {
//             source: setter,
//             status: VariableResultStatus.Denied,
//             error:
//               "Consent can not be set directly. Use ConsentEvents or the tracker's API.",
//           },
//         ]);
//         return undefined;
//       }

//       const mapping = this._getMapping(setter);
//       if (isVariablePatchAction(setter)) {
//         setter.patch = wrap(setter.patch, async (original, current) => {
//           const patched = await original(current);
//           return patched == null ||
//             this._censorValidate(
//               mapping,
//               patched,
//               setter,
//               i,
//               variables,
//               censored,
//               consent,
//               context,
//               true
//             )
//             ? patched
//             : undefined;
//         });
//       } else {
//         this._censorValidate(
//           mapping,
//           setter as any,
//           setter,
//           i,
//           variables,
//           censored,
//           consent,
//           context,
//           true
//         );
//       }
//     });

//     const results = await this._setWithRetry(
//       variables as any,
//       this._storage,
//       context
//     );

//     for (const [i, result] of censored) {
//       (results as VariableSetResult[])[i] = result;
//     }

//     return results as any;
//   }

//   renew(
//     scope: VariableScope,
//     scopeIds: string[],
//     context?: VariableStorageContext
//   ): MaybePromise<void> {
//     return this._storage.renew(scope, scopeIds, context);
//   }
//   purge(
//     filters: VariableFilter<true>[],
//     context?: VariableStorageContext
//   ): MaybePromise<boolean> {
//     return this._storage.purge(
//       this._restrictFilters(filters, context),
//       context
//     );
//   }

//   head(
//     filters: VariableFilter<true>[],
//     options?: VariableQueryOptions<true> | undefined,
//     context?: VariableStorageContext
//   ): MaybePromise<VariableQueryResult<VariableHeader<true>>> {
//     return this._storage.head(
//       this._restrictFilters(filters, context),
//       options,
//       context as any
//     );
//   }
//   async query(
//     filters: VariableFilter<true>[],
//     options?: VariableQueryOptions<true> | undefined,
//     context?: VariableStorageContext
//   ): Promise<VariableQueryResult<Variable<any, true>>> {
//     const results = await this._storage.query(
//       this._restrictFilters(filters, context),
//       options,
//       context as any
//     );
//     const consent = this._getContextConsent(context);

//     results.results = results.results.map((result) => ({
//       ...result,
//       value: this._patchAndCensor(
//         this._getMapping(result),
//         result,
//         result.value,
//         consent,
//         false
//       ),
//     }));

//     return results;
//   }
// }
