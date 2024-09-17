import { ClientRequestHeaders, Tracker, TrackerEnvironment } from ".";

/**
 * This is used to generate a probabilistically unique identifier from a client request
 * for anonymous tracking. This identifier is used to reference an anonymous session
 * and will not get stored itself.
 * That means the generated identifier may contain personal data which is by all chance the case
 * if any client-specific information is used from the request.
 *
 */
export interface ClientIdGenerator {
  /**
   * Generates a pseudo-unique identifier based on request information from the client.
   *
   * @param environment The tracker environment where the request happened.
   * @param request The client request information to use as the basis for the identifier.
   * @param stationary Whether to exclude information that may change during a session such as IP address.
   */
  generateClientId(
    environment: TrackerEnvironment,
    request: ClientRequestHeaders,
    stationary: boolean
  ): Promise<string>;
}

export interface ClientIdGeneratorSettings {
  /** The headers to consider when generating pseudo-unique identifiers. */
  headers?: string[];
}

export class DefaultClientIdGenerator implements ClientIdGenerator {
  private readonly _headers: string[];

  constructor({
    headers = [
      "accept-encoding",
      "accept-language",
      "sec-ch-ua",
      "sec-ch-ua-mobile",
      "sec-ch-ua-platform",
      "user-agent",
    ],
  }: ClientIdGeneratorSettings = {}) {
    this._headers = headers;
  }

  public async generateClientId(
    environment: TrackerEnvironment,
    request: ClientRequestHeaders,
    stationary: boolean
  ): Promise<string> {
    return [
      stationary ? "" : request.clientIp,
      ...this._headers.map((header) => request.headers[header] + ""),
    ].join("&");
  }
}
