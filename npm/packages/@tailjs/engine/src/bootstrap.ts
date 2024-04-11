import defaultSchema from "@tailjs/types/schema";
import {
  EngineHost,
  RequestHandler,
  RequestHandlerConfiguration,
  SchemaManager,
  TrackerExtension,
} from "./shared";

import type { TrackerConfiguration } from "@tailjs/client";
import { JsonObject, isString, rank, required } from "@tailjs/util";
import { map } from "./lib";

export type BootstrapSettings = {
  /** The host implementation to use.  */
  host: EngineHost;

  /** The relative URL to the Tail.js endpoint. */
  endpoint: string;

  /** A list of schemas. If a string is provided it is intepreted as a path and will get loaded from resources. */
  schemas?: (string | JsonObject)[];

  /** Coniguration for cookies. */
  cookies?: RequestHandlerConfiguration["cookies"];

  /** {@link TrackerExtension}s that are loaded into the request handler.  */
  extensions?: Iterable<
    TrackerExtension | (() => Promise<TrackerExtension> | TrackerExtension)
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
  environmentTags?: string[];

  /**
   * Configuration for the client script.
   */
  client?: TrackerConfiguration;
};

export async function bootstrap({
  host,
  endpoint,
  schemas,
  cookies,
  extensions,
  allowUnknownEventTypes,
  encryptionKeys,
  debugScript,
  environmentTags,
}: BootstrapSettings): Promise<RequestHandler> {
  (schemas ??= []).unshift(defaultSchema);
  if (schemas) {
    for (const [schema, i] of rank(schemas)) {
      if (isString(schema)) {
        schemas[i] = required(
          await host.readText(schema),
          () => `The schema path '${schema}' does not exists`
        );
      }
    }
  }

  const schema = new SchemaManager(schemas);
  return new RequestHandler({
    host,
    schema,
    endpoint,
    cookies,
    allowUnknownEventTypes,
    extensions: map(extensions, (extension) =>
      typeof extension === "function" ? extension : async () => extension as any
    ),
    encryptionKeys,
    debugScript,
    environmentTags,
  });
}
