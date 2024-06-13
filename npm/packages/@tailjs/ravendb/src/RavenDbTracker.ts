import {
  HttpRequest,
  TrackedEventBatch,
  Tracker,
  TrackerEnvironment,
  TrackerExtension,
} from "@tailjs/engine";
import { Lock, Nullish, createLock, truish } from "@tailjs/util";

export interface RavenDbSettings {
  url: string;
  database: string;
  x509?: ({ cert: Uint8Array | string } | { certPath: string }) &
    ({ key?: string } | { keyPath: string });
}

/**
 * This extension stores events in RavenDB.
 * It maps and assign IDs (and references to them) to events and sessions with incrementing base 36 numbers to reduce space.
 */
export class RavenDbTracker implements TrackerExtension {
  public readonly id = "ravendb";
  private readonly _settings: RavenDbSettings;
  private _lock: Lock;
  private _env: TrackerEnvironment;
  private _cert?: HttpRequest["x509"];
  constructor(settings: RavenDbSettings) {
    this._settings = settings;
    this._lock = createLock();
  }

  private _nextId = 0;
  private _idIndex = 1;
  private _idRangeMax = 0;
  private _idBatchSize = 1000;

  async initialize(env: TrackerEnvironment): Promise<void> {
    try {
      this._env = env;
      if (this._settings.x509) {
        const cert =
          "cert" in this._settings.x509
            ? this._settings.x509.cert
            : await this._env.read(this._settings.x509.certPath);

        const key =
          "keyPath" in this._settings.x509
            ? (await this._env.readText(this._settings.x509.keyPath)) ??
              undefined
            : this._settings.x509.key;

        if (!cert) {
          throw new Error("Certificate not found.");
        }
        this._cert = {
          id: this.id,
          cert,
          key,
        };
      }
    } catch (e) {
      env.log(this, {
        group: this.id,
        level: "error",
        source: `${this.id}:initialize`,
        message: "" + e,
      });
    }
  }

  async post(events: TrackedEventBatch, tracker: Tracker): Promise<void> {
    if (!tracker.session) {
      return;
    }

    try {
      const commands: any[] = [];

      // We add a convenient integer keys to the session, device session and event entities to get efficient primary keys
      // when doing ETL on the data.
      const ids = await tracker.get([
        {
          scope: "session",
          key: "rdb",
          init: async () => ({
            classification: "anonymous",
            purposes: "necessary",
            value: {
              source: [tracker.sessionId, tracker.deviceSessionId],

              mapped: [await this._getNextId(), await this._getNextId()],
            },
          }),
        },
      ]).value;

      var hasChanges = false;
      if (ids.source[0] !== tracker.sessionId) {
        ids.mapped[0] = await this._getNextId();
        hasChanges = true;
      }
      if (ids.source[1] !== tracker.deviceSessionId) {
        ids.mapped[1] = await this._getNextId();
        hasChanges = true;
      }

      if (hasChanges) {
        // Session and/or device session ID changed.
        await tracker.set([
          {
            scope: "session",
            key: "rdb",
            patch: (current) => {
              if (!current) return;
              return { ...current, value: ids };
            },
          },
        ]);
      }

      for (let ev of events) {
        const session = ev.session;
        if (!session) {
          continue;
        }

        // Integer primary key for the event entity.
        const internalEventId = await this._getNextId();

        ev["rdb:sessionId"] = ids.mapped[0];
        ev["rdb:deviceSessionId"] = ids.mapped[1];

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

      await this._env.request({
        method: "POST",
        url: `${this._settings.url}/databases/${encodeURIComponent(
          this._settings.database
        )}/bulk_docs`,
        headers: { ["content-type"]: "application/json" },
        x509: this._cert,
        body: JSON.stringify({ Commands: commands }),
      });
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
              await this._env.request({
                method: "PUT",
                url: `${this._settings.url}/databases/${encodeURIComponent(
                  this._settings.database
                )}/cmpxchg?key=NextEventId&index=${this._idIndex}`,
                headers: { ["content-type"]: "application/json" },
                body: JSON.stringify({ Object: idMax }),
                x509: this._cert,
              })
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
      } catch (e) {
        this._env.log(this, {
          group: this.id,
          level: "error",
          source: this.id,
          message: "" + e,
        });
      } finally {
        lockHandle();
      }
    }
    return id.toString(36);
  }
}
