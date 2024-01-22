import {
  HttpRequest,
  Tracker,
  TrackerEnvironment,
  TrackerExtension,
} from "@tailjs/engine";
import { TrackedEvent, transformLocalIds } from "@tailjs/types";
import { toString } from "@tailjs/util";
import { Lock } from "semaphore-async-await";

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
  public readonly name = "ravendb";
  private readonly _settings: RavenDbSettings;
  private _lock: Lock;
  private _env: TrackerEnvironment;
  private _cert?: HttpRequest["x509"];
  constructor(settings: RavenDbSettings) {
    this._settings = settings;
    this._lock = new Lock();
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
          id: this.name,
          cert,
          key,
        };
      }
    } catch (e) {
      env.log({
        group: this.name,
        level: "error",
        source: `${this.name}:initialize`,
        data: "" + e,
      });
    }
  }

  async post(
    events: TrackedEvent[],
    tracker: Tracker,
    env: TrackerEnvironment
  ): Promise<void> {
    try {
      const commands: any[] = [];

      let sessionId = toString(tracker.vars["rd_s"]?.value);
      let deviceId = toString(tracker.vars["rd_d"]?.value);
      let deviceSessionId = toString(tracker.vars["rd_ds"]?.value);

      tracker.vars["rd_s"] = {
        scope: "session",
        essential: true,
        critical: true,
        value: (sessionId ??= (await this._getNextId()).toString(36)),
      };

      tracker.vars["rd_d"] = {
        scope: "device",
        essential: true,
        critical: true,
        value: (deviceId ??= (await this._getNextId()).toString(36)),
      };

      tracker.vars["rd_ds"] = {
        scope: "device-session",
        essential: true,
        critical: true,
        value: (deviceSessionId ??= (await this._getNextId()).toString(36)),
      };

      for (let ev of events) {
        ev["rdb:timestamp"] = Date.now();

        ev = transformLocalIds(ev, (id) => `${sessionId}/${id}`);
        const internalEventId = (await this._getNextId()).toString(36);
        if (ev["id"] == null) {
          ev["id"] = `${internalEventId}`;
        }

        if (ev.session) {
          (ev.session as any)["rdb:deviceId"] = ev.session.deviceId;
          (ev.session as any)["rdb:sessionId"] = ev.session.sessionId;
          (ev.session as any)["rdb:deviceSessionId"] =
            ev.session.deviceSessionId;
          ev.session.deviceId = deviceId;
          ev.session.sessionId = sessionId;
          ev.session.deviceSessionId = deviceSessionId;
        }

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
      env.log({
        group: this.name,
        level: "error",
        source: `${this.name}:post`,
        data: "" + e,
      });
    }
  }

  private async _getNextId(): Promise<number> {
    let id = ++this._nextId;

    if (id >= this._idRangeMax) {
      await this._lock.wait();
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

            this._env.log({
              group: this.name,
              level: "debug",
              source: "ids",
              data: `The server reported the next global ID to be ${value}. Retrying with next ID ${idMax}.`,
            });
          }
          id = ++this._nextId;
        }
      } catch (e) {
        this._env.log({
          group: this.name,
          level: "error",
          source: this.name,
          data: "" + e,
        });
      } finally {
        this._lock.release();
      }
    }
    return id;
  }
}
