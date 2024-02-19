import { Lock } from "semaphore-async-await";

import {
  DataClassification,
  DataPurpose,
  Variable,
  VariableFilter,
  VariablePatchType,
  VariableScope,
  VariableSetResult,
  VariableSetter,
  VariableTarget,
} from "@tailjs/types";
import { clock, forEach, get, isUndefined, now, remove } from "@tailjs/util";

import { VariableStorage } from "..";

type InMemoryValue = Omit<Variable, "target" | "ttl" | "tags" | "purposes"> & {
  expires?: number;
  tags?: Record<string, boolean>;
  purposes?: Record<DataPurpose, DataPurpose>;
};

const GLOBAL_TARGET = { id: "", scope: VariableScope.Other };

const hasExpired = (value: { expires?: number }, referenceTime = now()) =>
  isUndefined(value.expires) || value.expires > referenceTime;

const testClassification = (
  classification: DataClassification,
  classifications: VariableFilter["classifications"]
) =>
  !classifications ||
  classifications?.min == null ||
  (classification >= classifications.min &&
    (classifications?.max == null || classification <= classifications.max) &&
    classifications.levels?.some((level) => classification === level) !==
      false);

const mapValue = (
  target: VariableTarget,
  value: InMemoryValue | undefined,
  expireBefore = now(),
  filter?: VariableFilter
): Variable | undefined =>
  !value ||
  hasExpired(value) ||
  filter?.tags?.some((tag) => value.tags?.[tag]) === false ||
  filter?.purposes?.some((purpose) => value.purposes?.[purpose] != null) ===
    false ||
  !testClassification(value.classification, filter?.classifications)
    ? undefined
    : {
        target: target?.id ? target : undefined,
        ...value,
        tags: value.tags && Object.keys(value.tags),
        purposes: value.purposes && Object.values(value.purposes),
        ttl: value.expires != null ? expireBefore - value.expires : undefined,
      };

type LockState = [lock: Lock, queue: number, owner: number];

export class InMemoryStore implements VariableStorage {
  public readonly id = "memory";

  private readonly _values = new Map<
    string,
    [
      permanent?: Record<string, InMemoryValue>[],
      volatile?: Record<string, InMemoryValue>[]
    ]
  >();

  private readonly _locks = new Map<string, LockState>();

  private _initialized = false;
  initialize() {
    if (this._initialized === (this._initialized = true)) {
      return;
    }

    const expireBefore = now();
    clock(() => {
      for (const [target, scopes] of this._values) {
        let n = 0; // This counts the number of non-expired volatile variables.
        if (scopes[1]) {
          for (const values of scopes[1]) {
            for (const key in values) {
              const value = values[key];
              if (value.expires != null && value.expires <= expireBefore) {
                delete values[key];
              } else {
                ++n;
              }
            }
          }
        }
        if (!n && !scopes[0]?.length) {
          // No non-expired and no permanent. Delete from map to free memory.
          this._values.delete(target);
        }
      }
    }, 5000);
  }

  get(
    key: string,
    target?: VariableTarget | null,
    purpose?: DataPurpose
  ): Variable | undefined {
    target ??= GLOBAL_TARGET;
    const scopes = this._values.get(target.id);
    if (!scopes) return undefined;
    const value = mapValue(
      target,
      scopes[0]?.[target.scope]?.[key] ?? scopes[1]?.[target.scope]?.[key]
    );

    return purpose && value?.purposes?.[purpose] !== purpose
      ? undefined
      : value;
  }

  query(...filters: VariableFilter[]) {
    const results: Variable[] = [];
    const expireBefore = now();
    for (const filter of filters) {
      const targets = filter.targets ?? [];
      const globalTarget = !targets.length;
      globalTarget && targets.push({ id: "" });

      for (const target of targets) {
        const values = this._values
          .get(target.id)
          ?.flatMap((groups) =>
            !groups
              ? []
              : (
                  target.scopes ??
                  Object.keys(groups).map((key) => +key as VariableScope)
                ).map(
                  (scope) =>
                    groups[scope] &&
                    ([scope as VariableScope, groups![scope]] as const)
                )
          )
          .filter((value) => value)!;
        for (const [scope, scopeValues] of values) {
          const valueTarget = globalTarget
            ? GLOBAL_TARGET
            : { id: target.id, scope };
          if (filter.keys) {
            for (const key of filter.keys) {
              const result = mapValue(
                valueTarget,
                scopeValues[key],
                expireBefore,
                filter
              );
              result && results.push(result);
            }
          } else {
            results.push(
              ...Object.values(scopeValues)
                .map(
                  (value) => mapValue(valueTarget, value, expireBefore, filter)!
                )
                .filter((value) => value)
            );
          }
        }
      }
    }
    return results;
  }

  public set(...variables: VariableSetter[]): VariableSetResult[] {
    const results: VariableSetResult[] = [];
    const t0 = now();

    for (const source of variables) {
      let { key, value, target, classification, patch, purposes, tags, ttl } =
        source;

      target = target?.id ? target : GLOBAL_TARGET;

      let groups = this._values.get(target.id);
      if ((ttl as any) <= 0) {
        value = undefined;
      }

      if (value === undefined && !groups) {
        results.push({ success: false, source });
      }

      if (patch) {
        const current = this.get(key, target)?.value;

        if (patch.type === VariablePatchType.Add) {
          value = (current ?? 0) + patch.value;
        } else if (
          (patch.type === VariablePatchType.IfGreater && current >= value) ||
          (patch.type === VariablePatchType.IfSmaller && current <= value) ||
          (patch.type === VariablePatchType.IfMatch && current !== value)
        ) {
          results.push({ success: false, source });
          continue;
        } else {
          value = patch.value;
        }
      }

      results.push({ success: true, newValue: value, source });
      const group = ttl != null ? 1 : 0;

      if (!value) {
        groups && delete groups[group]?.[target.scope]?.[key];
      } else {
        if (!groups) {
          this._values.set(target.id, (groups = []));
        } else {
          ((groups[group] ??= [])[target.scope] ??= {})[key] = {
            key,
            value,
            classification,
            expires: ttl != null ? t0 + ttl : undefined,
            purposes:
              purposes &&
              (Object.fromEntries(
                purposes.map((purpose) => [purpose, purpose])
              ) as any),
            tags: tags && Object.fromEntries(tags.map((tag) => [tag, true])),
          };
        }
      }
      results.push({ success: true, newValue: value, source });
    }
    return results;
  }

  private _nextLockId = 1;
  async lock(key: string, ttl?: number) {
    let myId = this._nextLockId++;

    const state = get(this._locks, key, () => [new Lock(), 0, 0] as const);
    ++state[1];
    const acquired = await (ttl ? state[0].waitFor(ttl) : state[0].acquire());
    // All the below happens atomically because ES is, after all, single threaded.
    state[2] = myId;
    if (!acquired) {
      state[0].release();
    }
    --state[1];
    if (!state[0].tryAcquire()) {
      // RACE!!!!
      return await this.lock(key, ttl);
    }

    return {
      get acquired() {
        return myId === state[2];
      },

      release() {
        if (state[2] === myId) {
          // We only release if we were not too slow.
          state[0].release();
        }
        if (--state[1] <= 0) {
          // Last one frees the memory.
          remove(this._locks, key);
        }
      },
    };
  }

  purge(...filters: VariableFilter[]) {
    if (!filters.length) {
      this._values.clear();
    }

    forEach(filters, (filter) => {
      if (filter.keys || filter.tags || filter.purposes) {
        for (const variable of this.query(filter)) {
          this.set({ ...variable, value: undefined });
        }
      } else {
        for (const target of filter.targets ?? [{ id: "" }]) {
          if (target.scopes) {
            const groups = this._values.get(target.id);
            if (!groups) continue;
            for (const scope of target.scopes) {
              for (const group of groups) {
                if (group) {
                  delete group[scope];
                }
              }
            }
          } else {
            this._values.delete(target.id);
          }
        }
      }
    });
  }
}
