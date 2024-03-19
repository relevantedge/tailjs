import { Tracker } from ".";

/**
 * This is used to generate a unique (or as unique as possible) identifier from a client request without using cookies
 * or any other information stored in the device.
 * The purpose is to have an identifer that is stable over the duration of a session to track anonymous statistics.
 *
 */
export interface SessionReferenceMapper {
  mapSessionId(tracker: Tracker): Promise<string>;
}

export class DefaultSessionReferenceMapper implements SessionReferenceMapper {
  async mapSessionId(tracker: Tracker): Promise<string> {
    let clientString: string = [
      tracker.clientIp,
      ...["accept-encoding", "accept-language", "user-agent"].map(
        (header) => tracker.headers[header]
      ),
    ].join("");

    return tracker.env.hash(clientString, 128);
  }
}
