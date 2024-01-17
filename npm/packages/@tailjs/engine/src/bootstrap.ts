import defaultSchema from "@tailjs/types/schema";
import {
  CryptoProvider,
  EngineHost,
  EventParser,
  RequestHandler,
  RequestHandlerConfiguration,
  TrackerExtension,
} from "./shared";

import type { TrackerConfiguration } from "@tailjs/client";
import { map } from "./lib";

export type BootstrapSettings = {
  host: EngineHost;
  endpoint: string;
  schema?: ConstructorParameters<typeof EventParser>[0];
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

export function bootstrap({
  host,
  endpoint,
  schema,
  cookies,
  extensions,
  allowUnknownEventTypes,
  crypto,
  encryptionKeys,
  useSession,
  debugScript,
  environmentTags,
  manageConsents,
}: BootstrapSettings): RequestHandler {
  const parser = new EventParser(schema ?? { default: defaultSchema });
  return new RequestHandler({
    host,
    parser,
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
