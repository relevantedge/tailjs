import { Lock } from "semaphore-async-await";

import {
  DataConsentLevel,
  TRACKER_SCOPES,
  TrackerScope,
  TrackerVariable,
  TrackerVariableFilter,
  TrackerVariableSetter,
  Variable,
  VariableFilter,
  VariablePatchType,
  VariableSetter,
} from "@tailjs/types";
import {
  clock,
  flatMap,
  forEach,
  get,
  isDefined,
  isUndefined,
  now,
  remove,
  set,
} from "@tailjs/util";

import { GlobalStorage, Tracker, TrackerStorage } from "..";

const isExpired = (value: { expires?: number }, referenceTime = now()) =>
  isUndefined(value.expires) || value.expires > referenceTime;

const mapValue = (
  scopeId: TrackerScope | undefined,
  value: InMemoryValue,
  t0 = now()
): TrackerVariable =>
  ({
    key: value.key,
    scope: scopeId,
    value: value.value,
    consentLevel: value.consentLevel,
    tags: value.tags,
    ttl: isDefined(value.expires) ? value.expires - t0 : undefined,
  } as any);

const getScopeKey = (tracker: Tracker, scope: TrackerScope) =>
  scope === "user"
    ? tracker.consentLevel < DataConsentLevel.Direct
      ? undefined
      : "u" + tracker.userid
    : scope === "device"
    ? tracker.consentLevel < DataConsentLevel.Indirect
      ? undefined
      : "d" + tracker.deviceId
    : scope === "device-session"
    ? "S" + tracker.deviceSessionId
    : "s" + tracker.sessionId;

type InMemoryValue = {
  key: string;
  value: any;
  consentLevel?: DataConsentLevel;
  tags?: string[];
  expires?: number;
};

export class InMemoryStore implements TrackerStorage, GlobalStorage {
  public readonly id = "memory";

  public readonly isGlobalStorage = true;
  public readonly isTrackerStorage = true;

  private readonly _values = new Map<string, Record<string, InMemoryValue>>();
  private readonly _locks = new Map<string, [lock: Lock, count: number]>();

  private _initialized = false;
  initialize() {
    if (this._initialized === (this._initialized = true)) {
      return;
    }

    const expireBefore = now();
    clock(() => {
      this._values.forEach((values, key) => {
        let n = 0;
        forEach(values, ([key, value]) => {
          if ((value.expires as any) < expireBefore) {
            this._values.delete(key);
          } else {
            ++n;
          }
        });
        if (!n) {
          this._values.delete(key);
        }
      });
    }, 2000);
  }

  public get(key: string): Variable | undefined;
  public get(
    tracker: Tracker,
    scope: TrackerScope,
    key: string
  ): TrackerVariable | undefined;

  get(trackerOrKey: Tracker | string, scope?: TrackerScope, key?: string) {
    let variables: Record<string, InMemoryValue> | undefined;
    if (trackerOrKey instanceof Tracker) {
      const scopeKey = getScopeKey(trackerOrKey, scope!);
      if (!scopeKey) return undefined;
      variables = this._values.get(scopeKey);
    } else {
      variables = this._values.get("");
    }
    if (!variables) return undefined;

    const t0 = now();
    const value = variables?.[key!];
    return !value || isExpired(value, t0) ? undefined : mapValue(scope, value);
  }

  public query(...filters: VariableFilter[]): Variable[];
  public query(
    tracker: Tracker,
    ...filters: TrackerVariableFilter[]
  ): TrackerVariable[];

  query(
    filterOrTracker?: Tracker | TrackerVariableFilter,
    ...filters: TrackerVariableFilter[]
  ) {
    let tracker: Tracker | undefined;
    if (filterOrTracker instanceof Tracker) {
      tracker = filterOrTracker;
    } else if (filterOrTracker) {
      filters.unshift(filterOrTracker);
    }

    if (!filters.length) {
      filters = [{}];
    }
    const t0 = now();
    const results: TrackerVariable[] = [];
    forEach(filters, ({ keys, consentLevels, tags, scopes }) => {
      forEach(
        tracker ? (scopes ? scopes : TRACKER_SCOPES) : [undefined],
        (scopeId: TrackerScope | undefined) => {
          const scopeKey = tracker ? getScopeKey(tracker, scopeId!) : "";
          if (!scopeKey) return;
          const scope = this._values.get(scopeKey);
          if (scope) {
            forEach(
              keys
                ? flatMap(keys, (key) => {
                    if (key.endsWith("*")) {
                      const prefix = key.substring(0, key.length - 1);
                      return Object.entries(scope)
                        .filter(([key]) => key.startsWith(prefix))
                        .map(([, value]) => value);
                    }
                    return scope[key];
                  })
                : Object.values(scope),
              (value) => {
                if (
                  (consentLevels &&
                    !consentLevels.includes(value.consentLevel!)) ||
                  isExpired(value, t0)
                )
                  return;
                if (tags) {
                  if (
                    !value.tags?.some((tag) =>
                      tags.some((filterTag) => tag === filterTag)
                    )
                  ) {
                    return undefined;
                  }
                }
                results.push(mapValue(scopeId, value));
              }
            );
          }
        }
      );
    });

    return results;
  }

  public set(...values: VariableSetter[]): (Variable | undefined)[];
  public set(
    tracker: Tracker,
    ...values: TrackerVariableSetter[]
  ): (undefined | TrackerVariable)[];

  set(
    trackerOrValue: VariableSetter | Tracker,
    ...values: TrackerVariableSetter[]
  ) {
    const results: (TrackerVariable | undefined)[] = [];
    let tracker: Tracker | undefined;
    if (trackerOrValue instanceof Tracker) {
      tracker = trackerOrValue;
    } else {
      values.unshift(trackerOrValue as any);
    }

    forEach(values, ({ key, scope, value, patch, consentLevel, tags, ttl }) => {
      const scopeKey = tracker ? getScopeKey(tracker, scope) : "";
      if (!isDefined(scopeKey)) return;
      if (!value && !this._values[scope]?.get(scopeKey)) return;

      if (patch) {
        const current = tracker
          ? this.get(tracker, scope, key)?.value
          : this.get(key)?.value;
        if (patch.type === VariablePatchType.Add) {
          value = (current ?? 0) + patch.value;
        } else if (
          patch.type === VariablePatchType.IfGreater &&
          current >= value
        ) {
          results.push(undefined);
          return;
        } else if (
          patch.type === VariablePatchType.IfSmaller &&
          current <= value
        ) {
          results.push(undefined);
          return;
        } else if (
          patch.type === VariablePatchType.IfMatch &&
          current !== value
        ) {
          results.push(undefined);
          return;
        } else {
          value = patch.value;
        }
      }
      results.push({ key, scope, value, consentLevel, tags, ttl });
      set(
        get(this._values, scopeKey, () => ({})) as Record<
          string,
          InMemoryValue
        >,
        key,
        value === undefined || (ttl as any) <= 0
          ? undefined
          : {
              key,
              value,
              consentLevel,
              tags,
              expires: ttl ? now() + ttl : undefined,
            }
      );
    });
    return results;
  }

  public async lock(key: string): Promise<() => void>;
  public async lock(tracker: Tracker, key?: string): Promise<() => void>;
  async lock(trackerOrKey: Tracker | string, key?: string) {
    key =
      trackerOrKey instanceof Tracker
        ? trackerOrKey.sessionId + "_" + key
        : trackerOrKey;
    const lock = get(this._locks, key, () => [new Lock(), 0] as const);
    ++lock[1];
    await lock[0].acquire();
    return () => {
      lock[0].release();
      if (--lock[1] <= 0) {
        remove(this._locks, key);
      }
    };
  }

  public purge(...filters: VariableFilter[]): void;
  public purge(tracker: Tracker, ...filters: TrackerVariableFilter[]): void;
  purge(
    filterOrTracker: Tracker | TrackerVariableFilter,
    ...filters: TrackerVariableFilter[]
  ) {
    let tracker: Tracker | undefined;
    if (filterOrTracker instanceof Tracker) {
      tracker = filterOrTracker;
    } else if (filterOrTracker) {
      filters.unshift(filterOrTracker);
    }
    if (!filters.length) {
      filters = [{}];
    }
    forEach(filters, (filter) => {
      if (filter.keys || filter.tags || filter.consentLevels) {
        tracker
          ? this.set(
              tracker,
              ...this.query(tracker, filter).map((value) => ({
                ...value,
                value: undefined,
              }))
            )
          : this.set(
              ...this.query(filter).map((value) => ({
                ...value,
                value: undefined,
              }))
            );
      } else {
        forEach(
          tracker ? filter.scopes ?? TRACKER_SCOPES : [undefined],
          (scopeId) => {
            const scopeKey = tracker ? getScopeKey(tracker, scopeId!) : "";
            remove(this._values, scopeKey);
          }
        );
      }
    });
  }
}
