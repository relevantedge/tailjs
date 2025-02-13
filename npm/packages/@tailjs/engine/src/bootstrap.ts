import {
  EngineHost,
  RequestHandler,
  RequestHandlerConfiguration,
  TrackerExtension,
} from "./shared";

import type { TrackerClientConfiguration } from "@tailjs/client";
import { Tag } from "@tailjs/types";
import { Falsish, map2, skip2 } from "@tailjs/util";

export interface BootstrapSettings
  extends Pick<
    RequestHandlerConfiguration,
    | "cookies"
    | "defaultConsent"
    | "json"
    | "storage"
    | "schemas"
    | "environment"
  > {
  /** The host implementation to use.  */
  host: EngineHost;

  /**
   * The absolute URL to the Tail.js endpoint.
   *
   * @default /_t.js
   */
  endpoint?: string;

  /** {@link TrackerExtension}s that are loaded into the request handler.  */
  extensions?: Iterable<
    | Falsish
    | TrackerExtension
    | (() => Promise<TrackerExtension> | TrackerExtension)
  >;

  /**
   * Whether event types that are not defined in a schema are allowed.
   * Only use this as a last resort if you have a burning deadline, and then make amends for your crime later.
   */
  allowUnknownEventTypes?: boolean;

  /**
   * Keys used for encryption.
   *
   * The first one is the active one, that is, all future communication will use this key.
   *
   * Key rollover is supported by adding keys once in a while.
   * If you delete keys be aware that you may lose old data from devices that were using that key.
   */
  encryptionKeys?: string[];

  /**
   * Whether to use the debug script that is easier to debug.
   * May also be a path to another script than the one bundled with the engine. This is useful for development.
   *
   */
  debugScript?: boolean | string;

  /**
   * If your deployment has multiple servers or environments, this can be used to identify them in the collected data.
   * These tags will only be added to {@link SessionStartedEvent}s.
   */
  environmentTags?: Tag[];

  /**
   * Configuration for the client script.
   */
  client?: TrackerClientConfiguration;
}

export function bootstrap({
  host,
  endpoint = "./_t.js",
  schemas,
  cookies,
  extensions,
  storage,
  json,
  encryptionKeys,
  debugScript,
  environment,
  defaultConsent,
}: BootstrapSettings) {
  return new RequestHandler({
    host,
    schemas,
    endpoint,
    cookies,
    extensions:
      map2(extensions, (extension) =>
        !extension
          ? skip2
          : typeof extension === "function"
          ? extension
          : async () => extension as any
      ) ?? [],
    storage,
    json,
    encryptionKeys,
    debugScript,
    environment,
    defaultConsent,
  });
}
