import {
  UserConsent,
  Variable,
  VariableClassification,
  VariableFilter,
  VariableGetError,
  VariableGetResult,
  VariableGetResults,
  VariableGetter,
  VariableHeader,
  VariableKey,
  VariableMetadata,
  VariablePatch,
  VariableQueryOptions,
  VariableQueryResult,
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
  rank,
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
  TrackerEnvironment,
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

export class VariableStorageCoordinator implements VariableStorage<false> {
  private _settings: Required<
    Omit<VariableStorageCoordinatorSettings, "schema" | "consent">
  >;

  private readonly _variables = new TupleMap<
    [scope: VariableScope, prefix: string],
    PrefixVariableMapping
  >();

  private readonly _storage: VariableSplitStorage;

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

    this._storage = new VariableSplitStorage(normalizedMappings);

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
        const results = await (targetStorage ?? this._storage).set(
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
    setters: VariableSetter<any, false>[],
    results: (VariableSetResult | undefined)[],
    context?: VariableStorageContext
  ): Promise<(VariableSetResult | undefined)[]> {
    const patches: PartitionItem<VariablePatch<any, false>>[] = [];

    let setter: VariableSetter<any, false>;
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
    key: VariableKey & Partial<VariableClassification>,
    value: any
  ): T {
    if (!target) return target;

    const definition = mapping.variables?.get(stripPrefix(key));
    if (definition) {
      target.classification = definition.classification;
      target.purposes = definition.purposes;
    } else {
      target.classification ??=
        key?.classification ?? mapping.classification?.classification;
      target.purposes ??=
        key?.purposes ??
        (key as any)?.purpose /* getters */ ??
        mapping.classification?.purposes;
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

  private _censorValidate(
    mapping: PrefixVariableMapping,
    target: Partial<VariableClassification> & { value: any },
    key: VariableKey & Partial<VariableClassification>,
    index: number,
    variables: readonly any[],
    censored: [index: number, result: VariableSetResult][],
    consent: UserConsent | undefined
  ) {
    if (isUndefined(target.value)) {
      return true;
    }
    if (
      tryCatch(
        () => (this._validate(mapping, target as any, key, target.value), true),
        (error) => (
          ((variables[index] as any) = undefined),
          censored.push([
            index,
            {
              source: key as any,
              status: VariableResultStatus.Denied,
              error,
            },
          ]),
          false
        )
      )
    ) {
      const wasDefined = isDefined(target.value);
      if (consent) {
        target.value = this._censor(
          mapping,
          { ...key, ...target },
          target.value,
          consent
        );
      }
      if (wasDefined && isUndefined(target.value)) {
        (variables[index] as any) = undefined;
        censored.push([
          index,
          { source: key as any, status: VariableResultStatus.Denied },
        ]);
      } else {
        return true;
      }
    }
    return false;
  }

  async get<K extends VariableGetParameter<false>>(
    keys: K | VariableGetParameter<false>,
    context?: VariableStorageContext | undefined
  ): Promise<VariableGetResults<K, false>> {
    const censored: [index: number, result: VariableSetResult][] = [];
    const consent = context?.consent ?? context?.tracker?.consent;

    for (const [getter, i] of rank(keys)) {
      toNumericVariable(getter);

      if (!getter || isUndefined(getter?.initializer)) {
        continue;
      }

      const mapping = this._getMapping(getter);
      getter.initializer = wrapFunction(
        getter.initializer,
        async (original) => {
          const result = await original();
          return isDefined(result?.value) &&
            this._censorValidate(
              mapping,
              result!,
              getter,
              i,
              keys,
              censored,
              consent
            )
            ? result
            : undefined;
        }
      );
    }

    const results = await this._storage.get(keys as any, context);
    for (const [i, result] of censored) {
      (results as VariableGetResult[])[i] = {
        ...result.source,
        status: result.status as any,
        error: (result as any).error,
      };
    }

    return addGetResultValidators(results) as any;
  }

  async set<K extends VariableSetParameter<false>>(
    variables: K | VariableSetParameter<false>,
    context?: VariableStorageContext | undefined
  ): Promise<VariableSetResults<K, false>> {
    const censored: [index: number, result: VariableSetResult][] = [];
    const consent = context?.consent ?? context?.tracker?.consent;

    // Censor the values (including patch actions) when the context has a tracker.
    variables.forEach((setter, i) => {
      if (!setter) return;

      toNumericVariable(setter);
      const mapping = this._getMapping(setter);

      if (isVariablePatchAction(setter)) {
        setter.patch = wrapFunction(setter.patch, async (original, current) => {
          const patched = await original(current);
          return isUndefined(patched) ||
            this._censorValidate(
              mapping,
              toNumericVariable(patched),
              setter,
              i,
              variables,
              censored,
              consent
            )
            ? patched
            : undefined;
        });
      } else {
        this._censorValidate(
          mapping,
          setter as any,
          setter,
          i,
          variables,
          censored,
          consent
        );
      }
    });

    const results = await this._storage.set(variables as any, context);
    for (const [i, result] of censored) {
      (results as VariableSetResult[])[i] = result;
    }

    return addSetResultValidators(results) as any;
  }

  configureScopeDurations(
    durations: Partial<Record<VariableScopeValue<false>, number>>,
    context?: VariableStorageContext | undefined
  ): void {
    this._storage.configureScopeDurations(durations, context);
  }
  renew(
    scope: VariableScope,
    scopeIds: string[],
    context?: VariableStorageContext | undefined
  ): MaybePromise<void> {
    return this._storage.renew(scope, scopeIds, context);
  }
  purge(
    filters: VariableFilter<boolean>[],
    context?: VariableStorageContext | undefined
  ): MaybePromise<void> {
    return this._storage.purge(filters, context);
  }

  head(
    filters: VariableFilter<boolean>[],
    options?: VariableQueryOptions<boolean> | undefined,
    context?: VariableStorageContext | undefined
  ): MaybePromise<VariableQueryResult<VariableHeader<true>>> {
    return this._storage.head(filters, options, context);
  }
  query(
    filters: VariableFilter<boolean>[],
    options?: VariableQueryOptions<boolean> | undefined,
    context?: VariableStorageContext | undefined
  ): MaybePromise<VariableQueryResult<Variable<any, true>>> {
    return this._storage.query(filters, options, context);
  }
}
