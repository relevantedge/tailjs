import type { TrackerConfiguration } from "@tailjs/client/external";
import { DEFAULT_CLIENT_CONFIG } from "@tailjs/client/external";

import { type ViewEvent } from "@tailjs/types";
import { JsonObject } from "@tailjs/util";
import { SessionReferenceMapper } from "./ClientIdGenerator";
import { AllRequired } from "./lib";
import {
  CryptoProvider,
  EngineHost,
  TrackerExtension,
  VariableStorageCoordinatorSettings,
} from "./shared";

/** Gives a hint what a string might be for methods that serialize results to strings */
export type JsonString = string;

export type CookieConfiguration = {
  namePrefix?: string;
  secure?: boolean;
};

export type RequestHandlerConfiguration = {
  trackerName?: string;
  scriptPath?: string;
  endpoint: string;
  host: EngineHost;
  schemas?: (string | JsonObject)[];
  extensions: Iterable<() => Promise<TrackerExtension> | TrackerExtension>;
  crypto?: CryptoProvider;
  encryptionKeys?: string[];
  cookies?: CookieConfiguration;
  allowUnknownEventTypes?: boolean;
  debugScript?: boolean | string;
  manageConsents?: boolean;
  environmentTags?: string[];
  clientKeySeed?: string;
  client?: TrackerConfiguration;
  sessionReferenceMapper?: SessionReferenceMapper;

  storage?: VariableStorageCoordinatorSettings["mappings"];

  /**
   * The session timeout in minutes.
   *
   * @default 30
   */
  sessionTimeout?: number;

  /**
   * The device session timeout in minutes.
   * If a user closes all tabs and windows related to your website and then comes back before this timeout it will not trigger a new device session.
   * In particular, this controls when the {@link ViewEvent.landingPage} is set.
   *
   * The difference between the session and device session timeouts is that device sessions are not reset as long as tabs or windows are open even if the user put their computer to sleep for days
   * (cf. the importance of {@ViewTimingEvent.visibleDuration} and {@ViewTimingEvent.interactiveDuration}).
   *
   * @default 10
   */
  deviceSessionTimeout?: number;

  /**
   * Collect the user's IP address.
   *
   * @default true
   */
  includeIp?: boolean;
};

export const DEFAULT: Omit<
  AllRequired<RequestHandlerConfiguration>,
  | "schemas"
  | "backends"
  | "host"
  | "extensions"
  | "endpoint"
  | "scriptPath"
  | "environmentTags"
  | "crypto"
  | "encryptionKeys"
  | "storage"
  | "sessionReferenceMapper"
> = {
  trackerName: "tail",
  cookies: {
    namePrefix: ".tail",
    secure: true,
  },
  allowUnknownEventTypes: true,
  debugScript: false,
  manageConsents: false,
  sessionTimeout: 30,
  deviceSessionTimeout: 10,
  includeIp: true,
  client: DEFAULT_CLIENT_CONFIG as any,
  clientKeySeed: "tailjs",
};
