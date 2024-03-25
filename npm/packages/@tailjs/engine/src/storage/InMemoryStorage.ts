import {
  DataPurposes,
  Variable,
  VariableFilter,
  VariableGetter,
  VariableHeader,
  VariableKey,
  VariableQueryOptions,
  VariableQueryResult,
  VariableScope,
  VariableScopeValue,
  VariableSetResult,
  VariableSetStatus,
  VariableSetter,
  VersionedVariableKey,
  dataClassification,
  dataPurposes,
  isVariablePatch,
  toStrict,
  variableScope,
} from "@tailjs/types";
import {
  Clock,
  MaybePromise,
  clock,
  forEach,
  isDefined,
  isUndefined,
  map,
  now,
  some,
} from "@tailjs/util";
import { applyPatchOffline, copy, parseKey, variableId } from "../lib";

import {
  VariableGetResult,
  VariableGetResults,
  VariableSetResults,
  VariableStorage,
  VariableStorageContext,
} from "..";

export type ScopeVariables = [
  expires: number | undefined,
  Map<string, Variable<any, true>>
];

export const hasChanged = (
  getter: VersionedVariableKey,
  current: Variable | undefined
) => isUndefined(getter.version) || current?.version !== getter.version;

export abstract class InMemoryStorageBase implements VariableStorage {
  private _ttl: Partial<Record<VariableScope, number>> | undefined;
  private _cleaner: Clock | undefined;

  /** For testing purposes to have the router apply the patches. @internal */
  public _testDisablePatch: boolean;

  constructor() {}

  /** If this method return `undefined`, the variable in question will not be updated. */
  protected abstract _getNextVersion(
    variable: Variable<any, true>
  ): string | undefined;

  protected abstract _getScopeValues(
    scope: VariableScope,
    targetId: string | undefined,
    require: boolean
  ): ScopeVariables | undefined;

  protected abstract _resetScope(scope: VariableScope): void;

  protected abstract _deleteTarget(
    scope: VariableScope,
    targetId: string
  ): void;

  protected abstract _getTargetsInScope(
    scope: VariableScope
  ): Iterable<[string, ScopeVariables]>;

  private _remove(variable: VariableKey<true>, timestamp?: number) {
    const values = this._getScopeValues(
      variable.scope,
      variable.targetId,
      false
    );
    if (values?.[1].has(variable.key)) {
      const ttl = this._ttl?.[variable.scope];
      values[0] = ttl ? (timestamp ?? now()) + ttl : undefined;
      values[1].delete(variable.key);
      return true;
    }
    return false;
  }

  private _update(variable: Variable<any, true>, timestamp?: number) {
    let scopeValues = this._getScopeValues(
      variable.scope,
      variable.targetId,
      true
    )!;

    variable = toStrict(variable);

    const ttl = this._ttl?.[variable.scope];
    scopeValues[0] = ttl ? (timestamp ?? now()) + ttl : undefined;
    scopeValues[1].set(variable.key, variable);

    return variable;
  }

  private _validateKey<T extends VariableKey<true> | null | undefined>(
    key: T
  ): T {
    if (key && key.scope !== VariableScope.Global && !key.targetId) {
      throw new TypeError(`Target ID is required for non-global scopes.`);
    }
    return key;
  }

  private _query(
    filters: VariableFilter[],
    settings?: VariableQueryOptions
  ): Variable<any, true>[] {
    const results = new Set<Variable<any, true>>();
    const timestamp = now();

    const ifNoneMatch = settings?.ifNoneMatch
      ? new Map(
          settings.ifNoneMatch.map((variable) => [
            variableId(variable),
            variable.version,
          ])
        )
      : null;

    const ifModifiedSince = settings?.ifModifiedSince ?? 0;

    for (const queryFilter of filters) {
      const match = (
        variable: Variable<any, true> | undefined
      ): variable is Variable<any, true> => {
        const { purposes, classification, tags } = queryFilter;
        if (
          !variable ||
          (variable.purposes &&
            purposes &&
            !(variable.purposes & dataPurposes(purposes))) ||
          (classification &&
            (variable.classification <
              dataClassification(classification.min)! ||
              variable.classification >
                dataClassification(classification.max)! ||
              classification.levels?.some(
                (level) => variable.classification === dataClassification(level)
              ) === false)) ||
          (tags &&
            (!variable.tags ||
              !tags.some((tags) =>
                tags.every((tag) => variable.tags!.includes(tag))
              )))
        ) {
          return false;
        }

        let matchVersion: string | undefined;
        if (
          (ifModifiedSince && variable.modified! < ifModifiedSince!) ||
          (isDefined((matchVersion = ifNoneMatch?.get(variableId(variable)))) &&
            variable.version === matchVersion)
        ) {
          // Skip the variable because it is too old or unchanged based on the settings provided for the query.
          return false;
        }

        return true;
      };
      for (const scope of map(queryFilter.scopes, variableScope) ??
        variableScope.values) {
        for (const [, scopeVars] of queryFilter.targetIds?.map(
          (targetId) =>
            [targetId, this._getScopeValues(scope, targetId, false)] as const
        ) ?? this._getTargetsInScope(scope)) {
          if (!scopeVars || scopeVars[0]! <= timestamp) continue;
          const vars = scopeVars[1];
          let nots: Set<string> | undefined = undefined;
          const mappedKeys =
            queryFilter.keys?.map((key) => {
              // Find keys that starts with `!` to exclude them from the results.
              const parsed = parseKey(key);
              if (parsed.not) {
                (nots ??= new Set()).add(parsed.sourceKey);
              }
              return parsed.key;
            }) ?? vars.keys();

          for (const key of mappedKeys.includes("*")
            ? vars.keys()
            : mappedKeys) {
            if (nots!?.has(key)) continue;

            const value = vars.get(key);
            if (match(value)) {
              results.add(value);
            }
          }
        }
      }
    }

    return [...results];
  }

  public clean() {
    const timestamp = now();
    forEach(this._ttl, ([scope, ttl]) => {
      if (isUndefined(ttl)) return;

      const variables = this._getTargetsInScope(scope);
      forEach(
        variables,
        ([targetId, variables]) =>
          variables[0]! <= timestamp - ttl &&
          this._deleteTarget(scope, targetId)
      );
    });
  }

  public renew(
    scope: VariableScope,
    targetIds: string[],
    context?: VariableStorageContext
  ) {
    const timestamp = now();

    const ttl = this._ttl?.[scope];
    if (!ttl) return;

    for (const targetId of targetIds) {
      const vars = this._getScopeValues(scope, targetId, false);
      if (vars) {
        vars[0] = timestamp;
      }
    }
  }

  public configureScopeDurations(
    durations: Partial<Record<VariableScopeValue<false>, number>>,
    context?: VariableStorageContext
  ): MaybePromise<void> {
    this._ttl ??= {};
    for (const [scope, duration] of Object.entries(durations).map(
      ([scope, duration]) => [variableScope(scope), duration]
    )) {
      duration! > 0 ? (this._ttl![scope] = duration) : delete this._ttl![scope];
    }

    let hasTtl = some(this._ttl, ([, ttl]) => ttl! > 0);
    if (this._cleaner || hasTtl) {
      (this._cleaner ??= clock({
        callback: () => this.clean(),
        frequency: 10000,
      })).toggle(hasTtl);
    }
  }

  private _applyGetFilters(
    getter: VariableGetter<any, true>,
    variable: Variable<any, true> | undefined
  ) {
    return !variable ||
      (getter.purpose && // The variable has explicit purposes and not the one requested.
        isDefined(variable.purposes) &&
        !(variable.purposes & getter.purpose))
      ? undefined
      : isDefined(getter.version) && variable?.version == getter.version
      ? variable
      : copy(variable);
  }

  public async get<
    K extends (VariableGetter<any, boolean> | null | undefined)[]
  >(
    getters: K,
    context?: VariableStorageContext
  ): Promise<VariableGetResults<K>> {
    const results = getters.map(toStrict).map((getter) => ({
      current: (getter = this._validateKey(getter))
        ? (this._applyGetFilters(
            getter,
            this._getScopeValues(getter.scope, getter.targetId, false)?.[1].get(
              getter.key
            )
          ) as VariableGetResult<any>)
        : undefined,
      getter,
    }));

    for (const item of results) {
      if (item.getter?.initializer && !isDefined(item[0])) {
        const initialValue = await item.getter.initializer();
        if (initialValue) {
          // Check if the variable has been created by someone else while the initializer was running.
          const current = this._getScopeValues(
            item.getter.scope,
            item.getter.targetId,
            false
          )?.[1].get(item.getter.key);
          if (!current) {
            item.current = copy(this._update({ ...item[1], ...initialValue }));
            item.current.initialized = true;
          }
        }
      }
    }

    return results.map((item) => {
      const variable = copy(item.current);
      if (
        variable &&
        item.getter?.version &&
        item.getter?.version === item.current?.version
      ) {
        variable.unchanged = true;
      }
      return variable;
    }) as VariableGetResults<K>;
  }

  public head(
    filters: VariableFilter[],
    options?: VariableQueryOptions | undefined,
    context?: VariableStorageContext
  ) {
    return this.query(filters, options);
  }

  public query(
    filters: VariableFilter[],
    options?: VariableQueryOptions,
    context?: VariableStorageContext
  ) {
    const results = this._query(filters, options);
    return {
      count: options?.count ? results.length : undefined,
      // This current implementation does not bother with cursors. If one is requested we just return all results. Boom.
      results: (options?.top && !options?.cursor?.include
        ? results.slice(options.top)
        : results
      ).map((variable) => copy(variable)),
    };
  }

  public set<Setters extends (VariableSetter<any> | null | undefined)[]>(
    variables: Setters & VariableSetter<any>[],
    context?: VariableStorageContext
  ): VariableSetResults<Setters> {
    const timestamp = now();
    const results: (VariableSetResult | undefined)[] = [];
    for (const source of variables.map(toStrict)) {
      this._validateKey(source);

      if (!source) {
        results.push(undefined);
        continue;
      }

      let {
        key,
        targetId,
        scope,
        classification,
        purposes,
        value,
        version,
        tags,
      } = source as Variable<any, true>;

      let scopeVars = this._getScopeValues(
        source.scope,
        source.targetId,
        false
      );
      if (scopeVars?.[0]! < timestamp) {
        scopeVars = undefined;
      }
      let current = scopeVars?.[1].get(key);

      if (isVariablePatch(source)) {
        if (this._testDisablePatch) {
          results.push({ status: VariableSetStatus.Unsupported, source });
          continue;
        }

        const patched = toStrict(applyPatchOffline(current, source));

        if (!isDefined(patched)) {
          results.push({
            status: VariableSetStatus.Unchanged,
            source,
            current: copy(current),
          });
          continue;
        }
        classification = patched.classification!;
        purposes = patched.purposes;
        value = patched.value;
      } else if (current?.version !== version) {
        results.push({
          status: VariableSetStatus.Conflict,
          source,
          current: copy(current),
        });
        continue;
      }

      if (isUndefined(value)) {
        results.push({
          status:
            current && this._remove(current)
              ? VariableSetStatus.Success
              : VariableSetStatus.Unchanged,
          source,
          current: undefined,
        });
        continue;
      }

      const nextValue: Variable<any, true> = {
        key,
        value,
        classification,
        targetId,
        scope,
        purposes:
          isDefined(current?.purposes) || purposes
            ? (current?.purposes ?? 0) | (purposes ?? 0)
            : DataPurposes.Necessary,
        tags: tags && [...tags],
      };

      nextValue.version = this._getNextVersion(nextValue);
      current = this._update(nextValue, timestamp);

      results.push(
        current
          ? {
              status: VariableSetStatus.Success,
              source,
              current,
            }
          : { status: VariableSetStatus.Denied, source }
      );
    }

    return results as VariableSetResults<Setters>;
  }

  public purge(filters: VariableFilter[], context?: VariableStorageContext) {
    for (const variable of this._query(filters)) {
      this._remove(variable);
    }
  }
}

export class InMemoryStorage extends InMemoryStorageBase {
  private readonly _variables: Map<string, ScopeVariables>[] =
    variableScope.values.map(() => new Map());

  private _nextVersion = 0;

  constructor() {
    super();
  }

  protected _getNextVersion(key: VariableKey) {
    return "" + ++this._nextVersion;
  }

  protected _getScopeValues(
    scope: VariableScope,
    targetId: string | undefined,
    require: boolean
  ) {
    let values = this._variables[scope].get(targetId ?? "");
    if (!values && require) {
      this._variables[scope].set(
        targetId ?? "",
        (values = [undefined, new Map()])
      );
    }
    return values;
  }

  protected _resetScope(scope: VariableScope): void {
    this._variables[scope].clear();
  }

  protected _deleteTarget(scope: VariableScope, targetId: string): void {
    this._variables[scope].delete(targetId);
  }

  protected _getTargetsInScope(
    scope: VariableScope
  ): Iterable<[string, ScopeVariables]> {
    return this._variables[scope];
  }
}
