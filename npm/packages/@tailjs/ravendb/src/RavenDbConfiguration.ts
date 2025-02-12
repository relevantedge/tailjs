import { HttpRequest, TrackerEnvironment } from "@tailjs/engine";

export interface RavenDbSettings {
  url: string;
  database: string;
  x509?: (
    | { cert: Uint8Array | string; certPath?: undefined }
    | { cert?: undefined; certPath: string }
  ) &
    ({ key?: string } | { keyPath: string });
}

export class RavenDbConfiguration {
  private _env: TrackerEnvironment;
  private _cert?: HttpRequest["x509"];
  private readonly _settings: RavenDbSettings;

  public readonly id: string;

  constructor(id: string, settings: RavenDbSettings) {
    this.id = id;
    this._settings = settings;
  }

  public async initialize(env: TrackerEnvironment) {
    this._env = env;
    if (this._settings.x509) {
      const cert =
        "cert" in this._settings.x509
          ? this._settings.x509.cert
          : await this._env.read(this._settings.x509.certPath);

      const key =
        "keyPath" in this._settings.x509
          ? (await this._env.readText(this._settings.x509.keyPath)) ?? undefined
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
  }

  public async request(method: string, operation: string, payload?: any) {
    if (operation[0] !== "/") {
      operation = "/" + operation;
    }
    const response = (
      await this._env.request({
        method: method,
        url: `${this._settings.url}/databases/${encodeURIComponent(
          this._settings.database
        )}/${operation}`,
        headers: { ["content-type"]: "application/json" },
        body: JSON.stringify(payload),
        x509: this._cert,
      })
    ).body;

    return JSON.parse(response);
  }
}
