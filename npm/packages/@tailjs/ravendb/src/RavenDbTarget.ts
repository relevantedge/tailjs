import {
  HttpRequest,
  TrackerEnvironment,
  TrackerEnvironmentInitializable,
} from "@tailjs/engine";
import { RavenDbSettings } from ".";

export abstract class RavenDbTarget implements TrackerEnvironmentInitializable {
  protected readonly _settings: RavenDbSettings;
  protected _env: TrackerEnvironment;
  protected _cert?: HttpRequest["x509"];
  public abstract id: string;

  constructor(settings: RavenDbSettings) {
    this._settings = settings;
  }

  async initialize(env: TrackerEnvironment): Promise<void> {
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

  protected _request(method: string, relativeUrl: string, body?: any) {
    return this._env.request({
      method,
      url: `${this._settings.url}/databases/${encodeURIComponent(
        this._settings.database
      )}/${relativeUrl}`,
      headers: { ["content-type"]: "application/json" },
      x509: this._cert,
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
  }
}
