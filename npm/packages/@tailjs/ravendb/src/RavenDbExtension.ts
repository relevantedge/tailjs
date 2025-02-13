import {
  SchemaBuilder,
  TrackedEventBatch,
  Tracker,
  TrackerExtension,
  VariableStorageMappings,
} from "@tailjs/engine";
import { Lock, createLock } from "@tailjs/util";
import { RavenDbSettings, RavenDbVariableStorage } from ".";
import { RavenDbTarget } from "./RavenDbTarget";
import { VariableServerScope } from "@tailjs/types";

export interface RavenDbExtensionSettings extends RavenDbSettings {
  // Whether to also use RavenDB for variable storage if other storage is not configured.
  variables?: boolean | VariableServerScope[];
}
/**
 * This extension stores events in RavenDB.
 * It maps and assign IDs (and references to them) to events and sessions with incrementing base 36 numbers to reduce space.
 */
export class RavenDbExtension
  extends RavenDbTarget
  implements TrackerExtension
{
  public readonly id = "ravendb";
  private _lock: Lock;
  private _storageScopes?: VariableServerScope[];

  constructor({ variables = true, ...settings }: RavenDbExtensionSettings) {
    super(settings);
    if (variables) {
      this._storageScopes =
        variables === true ? VariableServerScope.levels : variables;
      if (!this._storageScopes.length) {
        this._storageScopes = undefined;
      }
    }
    this._lock = createLock();
  }

  private _nextId = 0;
  private _idIndex = 1;
  private _idRangeMax = 0;
  private _idBatchSize = 1000;

  patchStorageMappings(mappings: VariableStorageMappings): void {
    if (!this._storageScopes) return;

    const variableStorage = new RavenDbVariableStorage(this._settings);
    for (const scope of this._storageScopes) {
      (mappings[scope] ??= {}).storage ??= variableStorage;
    }
  }

  async post(events: TrackedEventBatch, tracker: Tracker): Promise<void> {
    if (!tracker.session) {
      return;
    }

    try {
      const commands: any[] = [];

      for (let ev of events) {
        ev = { ...ev };

        // Integer primary key for the event entity.
        const internalEventId = await this._getNextId();

        commands.push({
          Type: "PUT",
          Id: `events/${internalEventId}`,
          Document: {
            ...ev,
            "@metadata": {
              "@collection": "events",
            },
          },
        });
      }

      await this._request("POST", "bulk_docs", { Commands: commands });
    } catch (e) {
      tracker.env.error(this, e);
    }
  }

  private async _getNextId(): Promise<string> {
    let id = ++this._nextId;

    if (id >= this._idRangeMax) {
      const lockHandle = await this._lock();
      try {
        id = ++this._nextId;
        if (id >= this._idRangeMax) {
          let idMax = this._idRangeMax + this._idBatchSize;
          for (let i = 0; i <= 100; i++) {
            const response = (
              await this._request(
                "PUT",
                `cmpxchg?key=NextEventId&index=${this._idIndex}`,
                { Object: idMax }
              )
            ).body;

            const result = JSON.parse(response);
            const success: boolean = result.Successful;
            if (typeof success !== "boolean") {
              throw new Error(`Unexpected response: ${response}`);
            }

            const index: number = result.Index;
            const value: number = result.Value.Object;

            this._idIndex = index;
            if (success) {
              this._idRangeMax = value;
              this._nextId = this._idRangeMax - this._idBatchSize - 1;

              break;
            }
            if (i >= 10) {
              throw new Error(
                `Unable to allocate event IDs. Current counter is ${value}@${index}`
              );
            }
            idMax = value + this._idBatchSize;

            this._env.debug(
              this,
              `The server reported the next global ID to be ${value}. Retrying with next ID ${idMax}.`
            );
          }
          id = ++this._nextId;
        }
      } catch (error) {
        this._env.log(this, {
          level: "error",
          message: "Generating the next sequence of IDs failed.",
          error,
        });
        throw error;
      } finally {
        lockHandle();
      }
    }
    return id.toString(36);
  }
}

/** @obsolete Use the name RavenDbExtension instead. */
export const RavenDbTracker = RavenDbExtension;
