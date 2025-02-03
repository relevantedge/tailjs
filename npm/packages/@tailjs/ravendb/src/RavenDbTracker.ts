import {
  SchemaBuilder,
  TrackedEventBatch,
  Tracker,
  TrackerExtension,
} from "@tailjs/engine";
import { Lock, createLock } from "@tailjs/util";
import { RavenDbSettings } from ".";
import { RavenDbTarget } from "./RavenDbTarget";

interface RavenDbSessionIds {
  sessionId?: string;
  deviceSessionId?: string;
  internalSessionId?: string;
  internalDeviceSessionId?: string;
}

/**
 * This extension stores events in RavenDB.
 * It maps and assign IDs (and references to them) to events and sessions with incrementing base 36 numbers to reduce space.
 */
export class RavenDbTracker extends RavenDbTarget implements TrackerExtension {
  public readonly id = "ravendb";
  private _lock: Lock;

  constructor(settings: RavenDbSettings) {
    super(settings);

    this._lock = createLock();
  }

  private _nextId = 0;
  private _idIndex = 1;
  private _idRangeMax = 0;
  private _idBatchSize = 1000;

  registerTypes(schema: SchemaBuilder): void {
    schema.registerSchema({
      namespace: "urn:tailjs:ravendb",
      variables: {
        session: {
          rdb: {
            classification: "anonymous",
            purposes: {},
            visibility: "trusted-only",
            properties: {
              sessionId: {
                primitive: "string",
              },
              deviceSessionId: {
                primitive: "string",
              },
              internalSessionId: {
                primitive: "string",
              },
              internalDeviceSessionId: {
                primitive: "string",
              },
            },
          },
        },
      },
    });
  }

  async post(events: TrackedEventBatch, tracker: Tracker): Promise<void> {
    if (!tracker.session) {
      return;
    }

    try {
      const commands: any[] = [];

      // We add a convenient integer keys to the session, device session and event entities to get efficient primary keys
      // when doing ETL on the data.
      let ids: RavenDbSessionIds | undefined = await tracker
        .get({
          scope: "session",
          key: "rdb",
        })
        .value();

      var hasChanges = false;
      if (tracker.sessionId && ids?.sessionId !== tracker.sessionId) {
        (ids ??= {}).internalSessionId = await this._getNextId();
        ids.sessionId = tracker.sessionId;
        hasChanges = true;
      }
      if (
        tracker.deviceSessionId &&
        ids?.deviceSessionId !== tracker.deviceSessionId
      ) {
        (ids ??= {}).internalDeviceSessionId = await this._getNextId();
        ids.deviceSessionId = tracker.deviceSessionId;
        hasChanges = true;
      }
      if (!tracker.sessionId && !tracker.deviceSessionId) {
        ids = undefined;
        hasChanges = true;
      }

      if (hasChanges) {
        // Session and/or device session ID changed.
        await tracker.set({
          scope: "session",
          key: "rdb",
          patch: () => ids,
        });
      }

      for (let ev of events) {
        ev = { ...ev };

        // Integer primary key for the event entity.
        const internalEventId = await this._getNextId();

        ev["rdb:sessionId"] = ids?.internalSessionId;
        ev["rdb:deviceSessionId"] = ids?.internalDeviceSessionId;

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
          group: this.id,
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
