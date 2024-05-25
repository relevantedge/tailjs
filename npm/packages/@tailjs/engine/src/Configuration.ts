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

  /** Allow browser-based clients to send data as JSON. @default false. */
  allowBrowserJson?: boolean;

  /**
   * Whether device cookies should be split by purpose (performance, functionality etc.) or just be shared in one,
   * if the user has consented to any of these. No device cookies are stored without consent.
   *
   * Depending on your preferences, you may found one of the approaches more convenient when documenting the cookies
   * used on your site.
   *
   *  Regardless, tail.js will not store data for purposes the user has not consented to, and existing data will get purged
   *  if the user withdraws their consent, so it should not make any difference from a legal point of view whether one or multiple cookies are used.
   *
   * This setting only apply to device data since non-essential session data will not be persisted at the client.
   *
   * @default false
   */
  cookiePerPurpose?: boolean;

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
  cookiePerPurpose: false,
  allowBrowserJson: false,
};
