import {
  TrackedEventBatch,
  Tracker,
  TrackerExtension,
  VariableStorageMappings,
} from "@tailjs/engine";
import { VariableServerScope } from "@tailjs/types";
import { Lock, createLock } from "@tailjs/util";
import {
  RavenDbSettings,
  RavenDbVariableStorage,
  RavenDbVariableStorageSettings,
} from ".";
import { RavenDbTarget } from "./RavenDbTarget";

export interface RavenDbExtensionSettings
  extends RavenDbSettings,
    RavenDbVariableStorageSettings {
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

  async post({ events }: TrackedEventBatch, tracker: Tracker): Promise<void> {
    try {
      const commands: any[] = [];

      for (let ev of events) {
        commands.push({
          Type: "PUT",
          Id: `events/${ev.id}`,
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
}

/** @obsolete Use the name RavenDbExtension instead. */
export const RavenDbTracker = RavenDbExtension;
