import {
  Variable,
  VariableClassification,
  VariableGetter,
  VariableKey,
  VariableScope,
} from "@tailjs/types";
import { isDefined, isUndefined } from "@tailjs/util";
import { Tracker, VariableGetResults, VariableStorage, parseKey } from "..";
import { InMemoryStorageBase, ScopeVariables } from "./InMemoryStorage";

const validateTargetId = (
  targetId: string | undefined,
  allowed: string | undefined
) => isDefined(allowed) && (isUndefined(targetId) || targetId === allowed);

export class TrackerStorage extends InMemoryStorageBase {
  private readonly _variables: ScopeVariables[];
  private readonly _backingStorage: VariableStorage;

  constructor(public readonly tracker: Tracker) {
    super();
    this._variables = [];
    this._backingStorage = tracker.env.storage;

    [VariableScope.Session, VariableScope.Device].forEach(
      (scope) => (this._variables[scope] = [undefined, new Map()])
    );
  }

  protected _mapResultVariable(variable: Variable): Variable | undefined {
    const version = this._getNextVersion(variable);
    return isDefined(version)
      ? ((variable.version = version), variable)
      : undefined;
  }

  private _getTargetIdForScope(scope: VariableScope) {
    if (scope === VariableScope.Session) {
      return this.tracker.sessionId;
    } else if (scope === VariableScope.Device) {
      return this.tracker.deviceId;
    }
    return undefined;
  }

  protected _getNextVersion(variable: Variable): string | undefined {
    const { level, purposes } = this.tracker.consent;
    if (
      // The tracker don't want it!
      variable.classification > level ||
      (purposes &&
        variable.purposes &&
        !variable.purposes.some((variable) => purposes.has(variable)))
    ) {
      return undefined;
    }

    if (variable.scope === VariableScope.Session) {
      return this.tracker.session.version;
    } else if (variable.scope === VariableScope.Device) {
      return this.tracker.device?.version;
    }

    return undefined;
  }

  protected _getScopeValues(
    scope: VariableScope,
    targetId: string | undefined
  ): [expires: number | undefined, Map<string, Variable<any>>] | undefined {
    if (isUndefined(targetId) || targetId != this._getTargetIdForScope(scope))
      return undefined;

    return this._variables[scope];
  }

  protected _resetScope(scope: VariableScope): void {
    const variables = this._variables[scope];
    if (variables) {
      variables[0] = undefined;
      variables[1].clear();
    }
  }

  protected _deleteTarget(scope: VariableScope, targetId: string): void {
    if (isDefined(targetId) && targetId === this._getTargetIdForScope(scope)) {
      this._resetScope(scope);
    }
  }
  protected _getTargetsInScope(
    scope: VariableScope
  ): Iterable<
    [string, [expires: number | undefined, Map<string, Variable<any>>]]
  > {
    const targetId = this._getTargetIdForScope(scope);
    return this._variables[scope] && targetId
      ? [[targetId, this._variables[scope]]]
      : [];
  }

  private _validateKey({ scope, targetId }: VariableKey) {
    return (
      (scope !== VariableScope.Device ||
        validateTargetId(targetId, this.tracker.deviceId)) &&
      (scope !== VariableScope.User ||
        validateTargetId(targetId, this.tracker.userId)) &&
      (scope !== VariableScope.Session ||
        validateTargetId(targetId, this.tracker.sessionId))
    );
  }

  async get<K extends (VariableGetter | null | undefined)[]>(
    ...getters: K
  ): Promise<VariableGetResults<K>> {
    const results: VariableGetResults<K> = Array(getters.length) as any;

    const own: { sourceIndex: number; getter: VariableGetter }[] = [];
    const external: typeof own = [];

    getters.forEach((getter, sourceIndex) => {
      if (!getter || !this._validateKey(getter)) {
        return;
      }

      const parsed = parseKey(getter.key);
      (parsed.prefix || !this._variables[getter.scope] ? external : own).push({
        sourceIndex,
        getter,
      });
    });

    if (external.length) {
      (
        await this._backingStorage.get(
          ...external.map((item) => item.getter as VariableGetter<any, false>)
        )
      ).forEach((result, i) => (results[external[i][0]] = result));
    }
    if (own.length) {
      (
        await super.get(
          ...own.map((item) => item.getter as VariableGetter<any, false>)
        )
      ).forEach((result, i) => (results[own[i][0]] = result));
    }

    return results;
  }
}
