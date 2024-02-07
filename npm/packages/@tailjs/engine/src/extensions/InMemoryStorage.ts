import {
  VariableGetRequest,
  VariableGetResponse,
  VariableScope,
  VariableValueConfiguration,
} from "@tailjs/types";
import {
  clear,
  clock,
  forEach,
  isUndefined,
  now,
  set,
  update,
} from "@tailjs/util";
import { size } from "packages/@tailjs/client/src/lib";
import { Tracker, TrackerEnvironment, VariableStore } from "..";

export class InMemoryStore implements VariableStore {
  public readonly id = "memory";

  private _values: Record<
    VariableScope,
    Map<string, Record<string, { value: any; expires?: number }>>
  >;

  async initialize(environment: TrackerEnvironment): Promise<void> {
    const expireBefore = now();
    clock(() => {
      forEach(this._values, ([, scopes]) =>
        forEach(scopes, ([scopeId, values]) => {
          forEach(values, ([key, value]) => {
            if ((value.expires as any) < expireBefore) {
              clear(values, key);
            }
          });
          if (!size(values)) {
            clear(scopes, scopeId);
          }
        })
      );
    }, 2000);
  }

  private _setValue(
    scope: VariableScope,
    scopeId: string,
    key: string,
    value: any,
    ttl: number | undefined
  ) {
    return set(
      update(
        (this._values[scope] ??= new Map()),
        scopeId,
        (current) => current ?? {}
      ),
      key,
      value === undefined || (ttl as any) <= 0
        ? undefined
        : { value, expires: ttl ? now() + ttl : undefined }
    );
  }

  private _getScopeKey(tracker: Tracker, scope: VariableScope) {
    return scope === "global"
      ? ""
      : scope === "device"
      ? tracker.deviceId
      : scope === "device-session"
      ? tracker.deviceSessionId
      : tracker.sessionId;
  }

  public async getAll(
    scope: VariableScope | null,
    tracker: Tracker
  ): Promise<Partial<Record<VariableScope, Record<string, any>>>> {
    const response: VariableGetResponse = {};

    forEach(this._values, ([valueScope, values]) => {
      if (scope && scope !== valueScope) return;
      const scopeKey = this._getScopeKey(tracker, valueScope);
      if (!scopeKey) return;

      const trackerValues = values.get(scopeKey);
      if (!trackerValues) return;

      forEach(trackerValues, ([name, { value }]) => {
        if (!scope || valueScope === scope) {
          value && ((response[valueScope] ??= {})[name] = value);
        }
      });
    });

    return response;
  }

  public async get(
    variables: VariableGetRequest,
    tracker: Tracker
  ): Promise<Partial<Record<VariableScope, Record<string, any>>>> {
    const response: VariableGetResponse = {};
    forEach(variables, ({ key: name, scope = "session" }) => {
      const scopeKey = this._getScopeKey(tracker, scope);
      if (isUndefined(scopeKey)) return;
      (response[scope] ??= {})[name] =
        this._values[scope]?.get(scopeKey)?.[name];
    });

    return response;
  }

  public async purge(
    scope: VariableScope[] | null,
    tracker: Tracker
  ): Promise<void> {
    forEach(
      scope ?? (["session", "device-session", "device"] as VariableScope[]),
      (valueScope: VariableScope) => {
        const scopeKey = this._getScopeKey(tracker, valueScope);
        if (!scopeKey) return;
        clear(this._values[scopeKey], scopeKey);
      }
    );
    // forEach(this._values, ([valueScope, values]) => {
    //   if (scope && scope !== valueScope) return;
    //   const scopeKey = this._getScopeKey(tracker, valueScope);
    //   if (!scopeKey) return;

    //   const trackerValues = values.get(scopeKey);
    //   if (!trackerValues) return;

    //   forEach(trackerValues, ([name, { value }]) => {
    //     if (!scope || valueScope === scope) {
    //       value && ((response[valueScope] ??= {})[name] = value);
    //     }
    //   });
    // });
  }

  public async set(
    variables: Partial<
      Record<VariableScope, Record<string, VariableValueConfiguration>>
    >,
    tracker: Tracker
  ): Promise<void> {
    forEach(variables, ([scope, values]) =>
      forEach(values, ([key, { value, ttl }]) => {
        const scopeKey = this._getScopeKey(tracker, scope);
        if (!scopeKey) return;
        return this._setValue(scope, scopeKey, key, value, ttl);
      })
    );
  }
}
