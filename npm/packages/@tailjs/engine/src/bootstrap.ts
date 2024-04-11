import defaultSchema from "@tailjs/types/schema";
import {
  CryptoProvider,
  EngineHost,
  EventParser,
  RequestHandler,
  RequestHandlerConfiguration,
  SchemaManager,
  TrackerExtension,
} from "./shared";

import type { TrackerConfiguration } from "@tailjs/client";
import { map } from "./lib";
import { RecordType, isString, rank, required } from "@tailjs/util";

export type BootstrapSettings = {
  host: EngineHost;
  endpoint: string;
  schemas?: (string | RecordType)[];
  cookies?: RequestHandlerConfiguration["cookies"];
  manageConsents?: boolean;
  extensions?: Iterable<
    TrackerExtension | (() => Promise<TrackerExtension> | TrackerExtension)
  >;
  allowUnknownEventTypes?: boolean;
  crypto?: CryptoProvider;
  encryptionKeys?: string[];
  useSession?: boolean;
  debugScript?: boolean | string;
  environmentTags?: string[];
  client?: TrackerConfiguration;
};

export async function bootstrap({
  host,
  endpoint,
  schemas,
  cookies,
  extensions,
  allowUnknownEventTypes,
  crypto,
  encryptionKeys,
  useSession,
  debugScript,
  environmentTags,
  manageConsents,
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
    crypto,
    encryptionKeys,
    useSession,
    debugScript,
    manageConsents,
    environmentTags,
  });
}
