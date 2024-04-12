import {
  UserConsent,
  Variable,
  VariableClassification,
  VariableGetResult,
  VariableGetResults,
  VariableGetter,
  VariableKey,
  VariableMetadata,
  VariablePatch,
  VariableResultStatus,
  VariableScope,
  VariableScopeValue,
  VariableSetResult,
  VariableSetResults,
  VariableSetter,
  addGetResultValidators,
  addSetResultValidators,
  formatKey,
  isConflictResult,
  isErrorResult,
  isVariablePatch,
  isVariablePatchAction,
  parseKey,
  stripPrefix,
  toNumericVariable,
  validateConsent,
  variableScope,
} from "@tailjs/types";
import {
  MaybeArray,
  MaybePromise,
  MaybeUndefined,
  Nullish,
  PartialRecord,
  TupleMap,
  delay,
  forEach,
  ifDefined,
  isDefined,
  isUndefined,
  required,
  tryCatch,
  waitAll,
  wrapFunction,
} from "@tailjs/util";
import {
  PartitionItem,
  applyPatchOffline,
  partitionItems,
  withSourceIndex,
} from "../lib";

import {
  ReadonlyVariableStorage,
  SchemaClassification,
  SchemaManager,
  SchemaVariableSet,
  VariableGetParameter,
  VariableSetParameter,
  VariableSplitStorage,
  VariableStorage,
  VariableStorageContext,
  isWritable,
} from "..";

export type SchemaBoundPrefixMapping = {
  storage: ReadonlyVariableStorage<false> | ReadonlyVariableStorage<true>;

  /**
   * The IDs of the schemas.
   */
  schema?: MaybeArray<string>;
  /**
   * If a variable's classification is not explicitly defined in a schema, this will be the default.
   * If omitted, set requests will fail unless classification and purpose is defined.
   */
  classification?: Partial<VariableClassification>;
};

export interface VariableStorageCoordinatorSettings {
  mappings: PartialRecord<
    VariableScopeValue | "default",
    | SchemaBoundPrefixMapping
    | Record<string, SchemaBoundPrefixMapping>
    | undefined
  >;
  schema: SchemaManager;
  consent?: UserConsent;
  retries?: number;
  transientRetryDelay?: number;
  errorRetryDelay?: number;
}

type PrefixVariableMapping = {
  variables: SchemaVariableSet | undefined;
  classification?: Partial<SchemaClassification>;
};

export class VariableStorageCoordinator
  extends VariableSplitStorage
  implements VariableStorage<true>
{
  private _settings: Required<
    Omit<VariableStorageCoordinatorSettings, "schema" | "consent">
  >;

  private readonly _variables = new TupleMap<
    [scope: VariableScope, prefix: string],
    PrefixVariableMapping
  >();

  public readonly validates = true as any;

  constructor({
    mappings,
    schema,
    retries = 3,
    transientRetryDelay = 50,
    errorRetryDelay = 250,
  }: VariableStorageCoordinatorSettings) {
    const normalizeMappings = (
      mappings:
        | SchemaBoundPrefixMapping
        | Record<string, SchemaBoundPrefixMapping>
    ): Record<string, SchemaBoundPrefixMapping> =>
      (mappings as SchemaBoundPrefixMapping)?.storage
        ? { "": mappings as SchemaBoundPrefixMapping }
        : (mappings as Record<string, SchemaBoundPrefixMapping>);

    const defaultMapping =
      mappings.default && normalizeMappings(mappings.default);
    const normalizedMappings: Record<
      VariableScopeValue<true>,
      Record<string, SchemaBoundPrefixMapping>
    > = {} as any;
    forEach(
      mappings,
      ([scope, mappings]) =>
        scope !== "default" &&
        mappings &&
        (normalizedMappings[variableScope(scope)] = normalizeMappings(mappings))
    );

    defaultMapping &&
      forEach(
        variableScope.values,
        (scope) =>
          !normalizedMappings[scope] &&
          (normalizedMappings[scope] = defaultMapping)
      );

    super(normalizedMappings);

    (this as any).validates = true as any; // Tee-hee...

    this._settings = {
      mappings,
      retries,
      transientRetryDelay,
      errorRetryDelay,
    };

    forEach(variableScope.values, (scope) =>
      forEach(normalizedMappings[scope], ([prefix, mapping]) =>
        this._variables.set([variableScope(scope), prefix], {
          variables: ifDefined(mapping.schema, (schemas) =>
            schema.compileVariableSet(schemas)
          ),
          classification: mapping.classification,
        })
      )
    );
  }

  private async _setWithRetry(
    setters: (VariableSetter<any> | null | undefined)[],
    targetStorage?: VariableStorage,
    context?: VariableStorageContext,
    patch?: (
      sourceIndex: number,
      result: VariableSetResult
    ) => MaybePromise<VariableSetter<any> | undefined>
  ): Promise<(VariableSetResult | undefined)[]> {
    const finalResults: (VariableSetResult | undefined)[] = [];
    let pending = withSourceIndex(setters);

    const retries = this._settings.retries;
    for (let i = 0; pending.length && i <= retries; i++) {
      const current = pending;
      let retryDelay = this._settings.transientRetryDelay;
      pending = [];
      try {
        const results = await (targetStorage ? targetStorage.set : super.set)(
          partitionItems(current),
          context
        );

        await waitAll(
          ...results.map(async (result, j) => {
            finalResults[j] = result;

            if (isErrorResult(result) && result.transient) {
              pending.push(current[j]);
            } else if (isConflictResult(result) && patch) {
              const patched = await patch(j, result);
              patched && pending.push([j, patched]);
            }
          })
        );
      } catch (e) {
        retryDelay = this._settings.errorRetryDelay;
        current.map(
          ([index, source]) =>
            source &&
            (finalResults[index] = {
              status: VariableResultStatus.Error as const,
              error: `Operation did not complete after ${retries} attempts. ${e}`,
              source: source,
            })
        );
        pending = current;
      }

      if (pending.length) {
        await delay((0.8 + 0.2 * Math.random()) * retryDelay * (i + 1));
      }
    }

    // Map original sources (lest something was patched).
    finalResults.forEach(
      (result, i) => result && (result.source = setters[i]!)
    );
    return finalResults;
  }

  protected async _patchGetResults(
    storage: ReadonlyVariableStorage,
    getters: VariableGetter<any>[],
    results: (Variable<any> | undefined)[]
  ): Promise<(Variable<any> | undefined)[]> {
    const initializerSetters: VariableSetter<any>[] = [];

    for (let i = 0; i < getters.length; i++) {
      const getter = getters[i];
      if (!getter.initializer || results[i]) {
        continue;
      }
      if (!isWritable(storage)) {
        throw new Error(
          `A getter with an initializer was specified for a non-writable storage.`
        );
      }

      const initialValue = await getter.initializer();
      if (!isDefined(initialValue)) {
        continue;
      }
      initializerSetters.push({ ...getter, ...initialValue });
    }

    if (isWritable(storage) && initializerSetters.length > 0) {
      await this._setWithRetry(initializerSetters, storage);
    }
    return results;
  }

  protected async _patchSetResults(
    storage: VariableStorage,
    setters: VariableSetter<any, true>[],
    results: (VariableSetResult | undefined)[],
    context?: VariableStorageContext
  ): Promise<(VariableSetResult | undefined)[]> {
    const patches: PartitionItem<VariablePatch<any, true>>[] = [];

    let setter: VariableSetter<any, true>;
    results.forEach(
      (result, i) =>
        result?.status === VariableResultStatus.Unsupported &&
        isVariablePatch((setter = setters[i])) &&
        patches.push([i, setter])
    );

    if (patches.length) {
      const applyPatch = async (
        patchIndex: number,
        current: Variable | undefined
      ) => {
        const [sourceIndex, patch] = patches[patchIndex];
        //const current = currentValues[i];
        const patched = await applyPatchOffline(current, patch);
        if (!patched) {
          results[sourceIndex] = {
            status: VariableResultStatus.Unchanged,
            current,
            source: setters[sourceIndex],
          };
        }
        return patched ? { ...setters[sourceIndex], ...patched } : undefined;
      };

      const patchSetters: PartitionItem<VariableSetter<any>>[] = [];
      const currentValues = storage.get(partitionItems(patches), context);

      for (let i = 0; i < patches.length; i++) {
        const patched = await applyPatch(i, currentValues[i]);
        if (patched) {
          patchSetters.push([i, patched]);
        }
      }

      if (patchSetters.length > 0) {
        (
          await this._setWithRetry(
            partitionItems(patchSetters),
            storage,
            context,
            (sourceIndex, result) =>
              isConflictResult(result)
                ? applyPatch(patchSetters[sourceIndex][0], result.current)
                : undefined
          )
        ).forEach((result, i) => {
          // Map setter to patch to source.
          const sourceIndex = patches[patchSetters[i][0]][0];
          result && (result.source = setters[sourceIndex]);
          results[sourceIndex] = result;
        });
      }
    }
    return results;
  }

  private _censor<
    T extends (VariableKey & Partial<VariableClassification>) | undefined,
    V
  >(
    mapping: PrefixVariableMapping,
    key: T,
    value: V,
    consent: UserConsent
  ): MaybeUndefined<T, V> {
    if (isUndefined(key) || isUndefined(value)) return undefined as any;

    const localKey = stripPrefix(key)!;
    if (mapping.variables?.has(localKey)) {
      return mapping.variables.censor(localKey, value, consent, false) as any;
    }

    return validateConsent(localKey, consent, mapping.classification)
      ? (value as any)
      : undefined;
  }

  private _getMapping({
    scope,
    key,
  }: {
    scope: VariableScopeValue;
    key: string;
  }) {
    const prefix = parseKey(key).prefix;
    return required(
      this._variables.get([variableScope(scope), prefix]),
      () =>
        `No storage provider is mapped to the prefix '${prefix}' in ${variableScope.format(
          scope
        )}`
    );
  }

  private _validate<
    T extends Partial<VariableClassification & VariableMetadata> | undefined
  >(
    mapping: PrefixVariableMapping,
    target: T,
    key: VariableKey,
    value: any
  ): T {
    if (!target) return target;

    const definition = mapping.variables?.get(stripPrefix(key));
    if (definition) {
      target.classification = definition.classification;
      target.purposes = definition.purposes;
    } else if (mapping.classification) {
      target.classification ??= mapping.classification.classification;
      target.purposes ??= mapping.classification.purposes;
    }
    required(
      target.classification,
      () =>
        `The variable ${formatKey(
          key
        )} must have an explicit classification since it is not defined in a schema, and its storage does not have a default classification.`
    );
    required(
      target.purposes,
      () =>
        `The variable ${formatKey(
          key
        )} must have explicit purposes since it is not defined in a schema, and its storage does not have a default classification.`
    );

    isDefined(value) && definition?.validate(value);

    return target;
  }

  async get<K extends VariableGetParameter<false>>(
    keys: K | VariableGetParameter<false>,
    context?: VariableStorageContext | undefined
  ): Promise<VariableGetResult<K, false>>;
  async get<K extends VariableGetParameter<true>>(
    keys: K | VariableGetParameter<true>,
    context?: VariableStorageContext | undefined
  ): Promise<VariableGetResults<K, true>>;
  async get(
    keys: (VariableGetter<any, true> | Nullish)[],
    context?: VariableStorageContext | undefined
  ): Promise<any> {
    // Censor the result of initializers (if any) based on consent when the context has a tracker.
    const consent = context?.consent ?? context?.tracker?.consent;
    for (const getter of keys) {
      toNumericVariable(getter);

      if (!getter || isUndefined(getter?.initializer)) {
        continue;
      }

      const mapping = this._getMapping(getter);
      getter.initializer = wrapFunction(
        getter.initializer,
        async (original) => {
          const result = await original();
          return ifDefined(result?.value, () => {
            toNumericVariable(result);
            return tryCatch(
              () => {
                this._validate(mapping, result, getter, result?.value);
                return consent
                  ? this._censor(
                      mapping,
                      {
                        ...getter,
                        purposes: result?.purposes ?? getter?.purpose,
                        classification: result?.classification,
                      },
                      result?.value,
                      consent
                    )
                  : result;
              },
              () =>
                /* Schema classification missing for unknown variables */ undefined
            );
          });
        }
      );
    }

    return addGetResultValidators(await super.get(keys, context));
  }

  async set<K extends VariableSetParameter<false>>(
    variables: K | VariableSetParameter<false>,
    context?: VariableStorageContext | undefined
  ): Promise<VariableSetResults<K, false>>;
  async set<K extends VariableSetParameter<true>>(
    variables: K | VariableSetParameter<true>,
    context?: VariableStorageContext | undefined
  ): Promise<VariableSetResults<K, true>>;
  async set<K extends VariableSetParameter<false>>(
    variables: K | VariableSetParameter<false>,
    context?: VariableStorageContext | undefined
  ): Promise<VariableSetResults<K, true>> {
    const censoredResults: [index: number, result: VariableSetResult][] = [];

    const consent = context?.consent ?? context?.tracker?.consent;

    // Censor the values (including patch actions) when the context has a tracker.
    variables.forEach((setter, i) => {
      if (!setter) return;

      toNumericVariable(setter);

      const mapping = this._getMapping(setter);

      if (isVariablePatchAction(setter)) {
        setter.patch = wrapFunction(setter.patch, async (original, current) => {
          const patched = await original(current);
          toNumericVariable(patched);
          this._validate(mapping, patched, setter, patched?.value);
          return ifDefined(patched?.value, (value) =>
            consent
              ? this._censor(
                  mapping,
                  {
                    ...setter,
                    classification:
                      patched!.classification ?? setter.classification,
                    purposes: patched!.purposes ?? setter.purposes,
                  },
                  value,
                  consent
                )
              : value
          );
        });
      } else if (isDefined(setter.value)) {
        if (
          tryCatch(
            () => (
              this._validate(mapping, setter as any, setter, setter.value), true
            ),
            (error) => (
              ((variables[i] as any) = undefined),
              censoredResults.push([
                i,
                { source: setter, status: VariableResultStatus.Denied, error },
              ]),
              false
            )
          )
        ) {
          if (consent) {
            setter.value = this._censor(mapping, setter, setter.value, consent);
          }
          if (isUndefined(setter.value)) {
            (variables[i] as any) = undefined;
            censoredResults.push([
              i,
              { source: setter, status: VariableResultStatus.Denied },
            ]);
          }
        }
      }
    });

    const results = await super.set(variables, context);
    for (const [i, result] of censoredResults) {
      (results as VariableSetResult[])[i] = result;
    }

    return addSetResultValidators(results);
  }
}
