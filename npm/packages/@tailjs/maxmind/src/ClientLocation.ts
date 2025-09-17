import {
  NextPatchExtension,
  SchemaBuilder,
  TrackedEventBatch,
  type Tracker,
  type TrackerEnvironment,
  type TrackerExtension,
} from "@tailjs/engine";
import { SessionLocationEvent, TrackedEvent } from "@tailjs/types";
import { Reader } from "maxmind";
import type { CityResponse } from "mmdb-lib";

type MmdbUrl = {
  fileName?: string;
  url: string;
  headers?: Record<string, string>;
};
export type ClientLocationConfiguration = {
  language?: string;
  mmdb?: string;
  source?: MmdbUrl;

  accountId?: string;
  apiKey?: string;
};
export class ClientLocation implements TrackerExtension {
  private readonly _language: string;
  private readonly _mmdbPath: string;
  private readonly _mmdbSource: undefined | MmdbUrl;

  private _initialized = false;
  private _reader: Reader<CityResponse> | null;

  public readonly id = "ClientLocation";

  constructor({
    language = "en",
    mmdb = "maxmind/GeoLite2-City.mmdb",
    source,
  }: ClientLocationConfiguration = {}) {
    this._language = language;
    this._mmdbPath = mmdb;
    this._mmdbSource = source;
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
    { events }: TrackedEventBatch,
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
        tracker
          .getRequestItems(this)
          .set(ClientLocation.name, this.filterNames(location, this._language));

        if (location) {
          events = [
            ...events,
            {
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
            } satisfies SessionLocationEvent,
          ] as TrackedEvent[] as any;
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
      let data = this._mmdbPath
        ? await host.read(
            this._mmdbPath,
            watch ? async () => await createReader(false) : undefined
          )
        : null;

      if (data == null) {
        if (this._mmdbSource) {
          const {
            fileName = "GeoLite2-City.mmdb",
            url,
            headers,
          } = this._mmdbSource;
          host.log(
            this,
            `'${this._mmdbPath}' could not be loaded, downloading from ${url}.`
          );

          const responseData = await host.request({
            url,
            headers,
            binary: true,
          });
          if (responseData == null) {
            host.error(this, `Downloading mmdb from ${url} failed.`);
            return;
          }

          data =
            (await host.decompress(responseData.body, "tar.gz"))?.find(
              (entry) => entry.name.endsWith(fileName)
            )?.data ?? null;
          if (data == null) {
            host.error(
              this,
              `The downloaded file from ${url} is not a valid tar.gz file, or does not contain the mmdb file '${fileName}'.`
            );
            return;
          }
        }
        if (this._mmdbPath) {
          if (data === null) {
            host.error(this, `'${this._mmdbPath}' could not be loaded.`);
            return;
          }
          await host.write(this._mmdbPath, data);
        }
      }

      this._reader = data ? new Reader<CityResponse>(Buffer.from(data)) : null;
      if (this._reader == null) {
        host.warn(
          this,
          "The mmdb file could not be loaded. Geo information will not be available."
        );
      }
    };

    await createReader(true);
  }
}
