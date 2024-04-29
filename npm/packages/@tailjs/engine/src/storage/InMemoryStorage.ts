import {
  DataPurposeFlags,
  Variable,
  VariableFilter,
  VariableGetResult,
  VariableGetResults,
  VariableGetter,
  VariableGetters,
  VariableKey,
  VariableQueryOptions,
  VariableResultStatus,
  VariableScope,
  VariableSetResult,
  VariableSetResults,
  VariableSetters,
  VersionedVariableKey,
  dataPurposes,
  extractKey,
  formatKey,
  isVariablePatch,
  parseKey,
  toNumericVariableEnums,
  variableScope,
} from "@tailjs/types";
import {
  Clock,
  MaybePromise,
  Nullish,
  clock,
  forEach,
  isDefined,
  isUndefined,
  now,
  rank,
  some,
  unwrap,
} from "@tailjs/util";
import { applyPatch, copy, variableId } from "../lib";

import { VariableStorage, VariableStorageContext } from "..";
import { ParsingVariableStorage } from "./ParsingVariableStorage";

export type ScopeVariables = [
  expires: number | undefined,
  variables: Map<string, Variable<any, true>>
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

  protected abstract _getScopeVariables(
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
    const values = this._getScopeVariables(
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
    let scopeValues = this._getScopeVariables(
      variable.scope,
      variable.targetId,
      true
    )!;

    variable = toNumericVariableEnums(variable);

    const ttl = this._ttl?.[variable.scope];
    scopeValues[0] = ttl ? (timestamp ?? now()) + ttl : undefined;
    scopeValues[1].set(variable.key, variable);

    return variable;
  }

  private _validateKey<T extends VariableKey<true> | Nullish>(key: T): T {
    if (key && key.scope !== VariableScope.Global && !key.targetId) {
      throw new TypeError(`Target ID is required for non-global scopes.`);
    }
    return key;
  }

  private _query(
    filters: VariableFilter<true>[],
    settings?: VariableQueryOptions<true>
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
          (variable.purposes && purposes && !(variable.purposes & purposes)) ||
          (classification &&
            (variable.classification < classification.min! ||
              variable.classification > classification.max! ||
              classification.levels?.some(
                (level) => variable.classification === level
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
      for (const scope of queryFilter.scopes ?? variableScope.values) {
        for (const [, scopeVars] of queryFilter.targetIds?.map(
          (targetId) =>
            [targetId, this._getScopeVariables(scope, targetId, false)] as const
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
      const vars = this._getScopeVariables(scope, targetId, false);
      if (vars) {
        vars[0] = timestamp;
      }
    }
  }

  public configureScopeDurations(
    durations: Partial<Record<VariableScope, number>>,
    context?: VariableStorageContext
  ): MaybePromise<void> {
    this._ttl ??= {};
    for (const [scope, duration] of Object.entries(durations).map(
      ([scope, duration]) => [+scope, duration]
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
    getter: VariableGetter<any, any, true>,
    variable: Variable<any, true> | undefined
  ) {
    return !variable ||
      (getter.purpose && // The variable has explicit purposes and not the one requested.
        !(variable.purposes & getter.purpose))
      ? undefined
      : isDefined(getter.version) && variable?.version == getter.version
      ? variable
      : copy(variable);
  }

  public async get<K extends VariableGetters<true>>(
    getters: VariableGetters<true, K>,
    context?: VariableStorageContext
  ): Promise<VariableGetResults<K>> {
    const variables = getters.map((getter) => ({
      current:
        getter &&
        this._getScopeVariables(getter.scope, getter.targetId, false)?.[1].get(
          getter.key
        ),
      getter,
    }));

    const results: VariableGetResult[] = [];
    for (const [item, i] of rank(variables)) {
      if (!item.getter) continue;
      if (!item.current) {
        if (item.getter?.init) {
          const initialValue = await unwrap(item.getter.init);
          if (initialValue?.value) {
            // Check if the variable has been created by someone else while the initializer was running.

            results[i] = copy(
              this._update({ ...extractKey(item.getter!), ...initialValue }),
              {
                status: VariableResultStatus.Created,
              } as VariableGetResult
            );
            continue;
          }
        }
        results[i] = {
          ...extractKey(item.getter),
          status: VariableResultStatus.NotFound,
        };
        continue;
      }

      if (
        !(
          item.current.purposes &
          ((item.getter.purpose ?? 0) | DataPurposeFlags.Anonymous)
        )
      ) {
        results[i] = {
          ...extractKey(item.getter),
          status: VariableResultStatus.Denied,
          error: `${formatKey(
            item.getter
          )} is not stored for ${dataPurposes.logFormat(
            item.getter.purpose ?? DataPurposeFlags.Necessary
          )}`,
        };
        continue;
      }

      results[i] = copy(item.current, {
        status:
          item.getter?.version && item.getter?.version === item.current?.version
            ? VariableResultStatus.Unchanged
            : VariableResultStatus.Success,
      } as VariableGetResult);
    }

    return results as VariableGetResults<K>;
  }

  public head(
    filters: VariableFilter<true>[],
    options?: VariableQueryOptions<true> | undefined,
    context?: VariableStorageContext
  ) {
    return this.query(filters, options);
  }

  public query(
    filters: VariableFilter<true>[],
    options?: VariableQueryOptions<true>,
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

  public async set<Setters extends VariableSetters<true>>(
    variables: Setters | VariableSetters<true>,
    context?: VariableStorageContext
  ): Promise<VariableSetResults<Setters>> {
    const timestamp = now();
    const results: (VariableSetResult | undefined)[] = [];
    for (const source of variables.map(toNumericVariableEnums)) {
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

      let scopeVars = this._getScopeVariables(
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
          results.push({ status: VariableResultStatus.Unsupported, source });
          continue;
        }

        const patched = toNumericVariableEnums(
          await applyPatch(current, source)
        );

        if (!isDefined(patched)) {
          results.push({
            status: VariableResultStatus.Unchanged,
            source,
            current: copy(current),
          });
          continue;
        }
        classification = patched.classification ?? classification;
        purposes = patched.purposes ?? purposes;
        value = patched.value;
      } else if (!source.force && current?.version !== version) {
        results.push({
          status: VariableResultStatus.Conflict,
          source,
          current: copy(current)!,
        });
        continue;
      }

      if (isUndefined(value)) {
        results.push({
          status:
            current && this._remove(current)
              ? VariableResultStatus.Success
              : VariableResultStatus.Unchanged,
          source,
          current: undefined,
        });
        continue;
      }

      const previous = current;

      const nextValue: Variable<any, true> = {
        key,
        value,
        classification,
        targetId,
        scope,
        purposes:
          isDefined(current?.purposes) || purposes
            ? (current?.purposes ?? 0) | (purposes ?? 0)
            : DataPurposeFlags.Necessary,
        tags: tags && [...tags],
      };

      nextValue.version = this._getNextVersion(nextValue);
      current = this._update(nextValue, timestamp);

      results.push(
        current
          ? {
              status: previous
                ? VariableResultStatus.Success
                : VariableResultStatus.Created,
              source,
              current,
            }
          : { status: VariableResultStatus.Denied, source }
      );
    }

    return results as VariableSetResults<Setters>;
  }

  public purge(
    filters: VariableFilter<true>[],
    context?: VariableStorageContext
  ) {
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

  protected _getScopeVariables(
    scope: VariableScope,
    targetId: string | undefined,
    require: boolean
  ) {
    let values = this._variables[scope]?.get(targetId ?? "");
    if (!values && require) {
      (this._variables[scope] ??= new Map()).set(
        targetId ?? "",
        (values = [undefined, new Map()])
      );
    }
    return values;
  }

  protected _resetScope(scope: VariableScope): void {
    this._variables[scope]?.clear();
  }

  protected _deleteTarget(scope: VariableScope, targetId: string): void {
    this._variables[scope]?.delete(targetId);
  }

  protected _getTargetsInScope(
    scope: VariableScope
  ): Iterable<[string, ScopeVariables]> {
    return this._variables[scope] ?? [];
  }
}
