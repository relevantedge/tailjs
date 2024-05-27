import { ClientRequestHeaders, Tracker, TrackerEnvironment } from ".";

/**
 * This is used to generate a unique (or as unique as possible) identifier from a client request without using cookies
 * or any other information stored in the device.
 *
 * The purpose is to have an identifier that is stable over the duration of a session to track anonymous statistics.
 *
 */
export interface ClientIdGenerator {
  /**
   * Generates a pseudo-unique identifier based on request information from the client.
   *
   * @param environment The tracker environment where the request happened.
   * @param request The client request information to use as the basis for the identifier.
   * @param stationary Only include information that is unlikely to change between sessions.
   * This will amongst other things exclude the IP address, and these identifiers are not suitable for
   * tracking. However, they a great for adding entropy to cryptographic keys.
   * @param entropy Entropy that will be added before a hash is generated. This adds an additional layer
   * to make the generated IDs anonymous.
   */
  generateClientId(
    environment: TrackerEnvironment,
    request: ClientRequestHeaders,
    stationary: boolean,
    entropy?: string
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
    stationary: boolean,
    entropy?: string
  ): Promise<string> {
    let clientString: string = [
      stationary ? "" : request.clientIp,
      entropy,
      ...this._headers.map((header) => request.headers[header] + ""),
      entropy,
    ].join("&");

    return environment.hash(clientString, 128);
  }
}
