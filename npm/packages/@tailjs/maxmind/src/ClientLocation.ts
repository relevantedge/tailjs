import {
  NextPatchExtension,
  SchemaBuilder,
  type Tracker,
  type TrackerEnvironment,
  type TrackerExtension,
} from "@tailjs/engine";
import { SessionLocationEvent, TrackedEvent } from "@tailjs/types";
import { restrict } from "@tailjs/util";
import { Reader } from "maxmind";
import type { CityResponse } from "mmdb-lib";

export class ClientLocation implements TrackerExtension {
  private readonly _language: string;
  private readonly _mmdb: string;
  private _i = 0;

  private _initialized = false;
  private _reader: Reader<CityResponse> | null;

  public readonly id = "ClientLocation";

  constructor({
    language = "en",
    mmdb = "maxmind/GeoLite2-City.mmdb",
  }: { language?: string; mmdb?: string } = {}) {
    this._language = language;
    this._mmdb = mmdb;
  }

  registerTypes(schema: SchemaBuilder): void {
    schema.registerSchema({
      namespace: "urn:tailjs:maxmind",
      variables: {
        session: {
          mx: {
            visibility: "trusted-only",
            primitive: "string",
          },
          country: {
            primitive: "string",
          },
        },
      },
    });
  }

  public async patch(
    events: TrackedEvent[],
    next: NextPatchExtension,
    tracker: Tracker
  ) {
    if (!tracker.session) return next(events);

    if (!this._initialized) throw new Error("Not initialized");
    //if (!tracker.consent?.active) return events;

    const env = tracker.env;
    let country = "NA";

    const ip = tracker.clientIp;

    if (ip) {
      // Send a new location event whenever the consent changes.
      // The new consent may influence how much data gets tracked.
      const clientHash = env.hash(ip + JSON.stringify(tracker.consent));
      if (
        (await tracker.get({ scope: "session", key: "mx" }).value()) !==
        clientHash
      ) {
        const location = this.filterNames(this._reader?.get(ip));
        tracker.requestItems.set(
          ClientLocation.name,
          this.filterNames(location, this._language)
        );

        if (location) {
          events = [
            ...events,
            restrict<SessionLocationEvent>({
              type: "session_location",
              accuracy: location.location?.accuracy_radius,
              city: location.city
                ? {
                    name: location.city.names[this._language],
                    geonames: location.city.geoname_id,
                    confidence: location.city.confidence,
                  }
                : undefined,
              zip: location.postal?.code,

              subdivision: location.subdivisions
                ? location.subdivisions.map((sub) => ({
                    name: sub.names[this._language],
                    geonames: sub.geoname_id,
                    iso: sub.iso_code,
                    confidence: sub.confidence,
                  }))[0]
                : undefined,
              country: location.country
                ? {
                    name: location.country.names[this._language],
                    geonames: location.country.geoname_id,
                    iso: location.country.iso_code,
                  }
                : undefined,
              continent: location.continent
                ? {
                    name: location.continent.names[this._language],
                    geonames: location.continent.geoname_id,
                    iso: location.continent.code,
                  }
                : undefined,
              lat: location.location?.latitude,
              lng: location.location?.longitude,
              tags: [
                {
                  tag: "maxmind:build-epoch",
                  value:
                    this._reader?.metadata.buildEpoch?.toString() ??
                    "(unknown)",
                },
              ],
            }),
          ];
        }
        country = location?.country?.names[this._language] ?? "NA";
        await tracker.set([
          {
            scope: "session",
            key: "mx",
            value: clientHash,
            force: true,
          },
          {
            scope: "session",
            key: "country",
            value: country,
            force: true,
          },
        ]);
      }
    }

    return await next(events);
  }

  public filterNames<T = any>(parent: T, language = "en"): T | undefined {
    if (typeof parent !== "object") return;
    for (const p in parent) {
      const value = parent[p];
      if (typeof value !== "object") continue;
      if (p === "names") {
        const primaryName = value![language] ?? value!["en"];
        if (primaryName) {
          parent![p] = { [language]: value![language] } as any;
        }
        continue;
      }
      this.filterNames(value);
    }
    return parent;
  }

  public async initialize(host: TrackerEnvironment) {
    if (this._initialized == (this._initialized = true)) {
      return;
    }
    const createReader = async (watch: boolean) => {
      const data = await host.read(
        this._mmdb,
        watch ? async () => await createReader(false) : undefined
      );

      this._reader = data ? new Reader<CityResponse>(Buffer.from(data)) : null;
      if (this._reader == null) {
        host.error(
          this,
          `'${this._mmdb}' could not be loaded from the environment host.`
        );
      }
    };

    await createReader(true);
  }
}
