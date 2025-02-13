import {
  HttpRequest,
  HttpResponse,
  TrackerEnvironment,
  TrackerEnvironmentInitializable,
} from "@tailjs/engine";
import { RavenDbSettings } from ".";
import { formatError, json2, now, stringify2 } from "@tailjs/util";

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

  protected async _request(
    method: string,
    relativeUrl: string,
    body?: any,
    headers?: { [name: string]: string | undefined }
  ): Promise<HttpResponse & { error?: any }> {
    const url = `${this._settings.url}/databases/${encodeURIComponent(
      this._settings.database
    )}/${relativeUrl}`;

    const request = {
      method,
      url,
      headers: { ["content-type"]: "application/json", ...headers },
      x509: this._cert,
      body: body && (typeof body === "string" ? body : JSON.stringify(body)),
    };
    try {
      const response = (await this._env.request(request)) as HttpResponse & {
        error?: any;
      };
      if (response.status === 500) {
        const body = json2(response.body);
        response.error = new Error(
          body?.Type ? `${body.Type}: ${body.Message}` : "(unspecified error)"
        );
      }
      return response;
    } catch (error) {
      return {
        request,
        status: 500,
        headers: {},
        cookies: {},
        body: stringify2({ Message: formatError(error, true) }),
        error,
      };
    }
  }
}
