// import type { TrackerClientConfiguration } from "@tailjs/client/external";
// import { CLIENT_CONFIG } from "@tailjs/client/external";

import {
  UserConsent,
  type DataPurposes,
  type ViewEvent,
  type ViewTimingData,
} from "@tailjs/types";
import { AllRequired, JsonObject } from "@tailjs/util";
import { ClientIdGenerator } from ".";
import {
  CryptoProvider,
  EngineHost,
  TrackerExtension,
  VariableStorageMappings,
} from "./shared";

/** Gives a hint what a string might be for methods that serialize results to strings */
export type JsonString = string;

export type CookieConfiguration = {
  namePrefix?: string;
  secure?: boolean;
};

export type RequestHandlerConfiguration = {
  /**
   * The name of the global tracker object.
   * @default "tail"
   */
  trackerName?: string;

  /**
   * The API endpoint the client script communicates with.
   */
  endpoint: string;

  /**
   * An implementation of the engine host used to communicate with the outer world.
   * In pure V8 contexts, these methods must be implemented matching the V8 host's environment.
   */
  host: EngineHost;

  /**
   * The JSON schemas defining the available events and variables.
   * The tracker will not work without the core schema, but it is perfectly fine
   * to change the data classifications of the fields.
   */
  schemas?: (string | JsonObject)[];

  /**
   * Extensions that may enable events to be stored in a database,
   * variables to be read from various backend systems, event transformations,
   * client and/or server integrations with other tracking/analytics solutions etc.
   */
  extensions: Iterable<() => Promise<TrackerExtension> | TrackerExtension>;

  /**
   * An external implementation of the cryptographic routines specifically needed for
   * communication between the client and the server.
   */
  crypto?: CryptoProvider;

  /**
   * The master encryption key for communication. Only the first one is used,
   * but data from clients with cookies encrypted with a previous key can still be decrypted
   * as long as the previous keys are kept in this list (it is a simple rolling encryption scheme).
   */
  encryptionKeys?: string[];

  /**
   * Configuration of cookie names, and common security attributes for cookies.
   */
  cookies?: CookieConfiguration;

  /**
   * Either the path to an alternative script to use instead of the default minified one.
   * If true, a version of the script that outputs activity to the browser console and contains
   * a source map is used. Paths are resolved using the engine host, in particular, paths in the reserved
   * directory `js` will be resolved relative to the `@tailjs/client` package's `iife` directory
   * (for example, `js/tail.debug.map.js` is the same as setting this property to `true`).
   *
   * @default false
   */
  debugScript?: boolean | string;

  /**
   * Use JSON instead of LFSR encrypted MessagePack. This should only be set for debugging purposes
   * since it enables fingerprinting.
   */
  json?: boolean;

  /**
   * Common tags that will be added to all collected events. This can be used to differentiate between different
   * server nodes in a clustered environment, or the purpose of environment (like dev, qa, staging or production).
   */
  environmentTags?: string[];

  /**
   * This is used to add entropy to temporary keys used for short-term communication and
   * cookie-less, pseudonomized client identifiers. This adds an extra protection against tracing
   * a pseudonomized client hash back to the user even if a temporary hash has escaped the system,
   * and the the user's IP and device is known at a specific time.
   *
   * Do specify your own value here instead of the default. That makes it significantly harder to guess...
   */
  clientEncryptionKeySeed?: string;

  /**
   * The configuration for the client-side tracker.
   */
  client?: any; //TrackerClientConfiguration;

  /**
   * The specific logic that maps a cookie-less client request to a unique'ish identifier.
   * This is kept separate from the environment host, but such a host may be able to leverage
   * additional information about the client such as a login-token or similar. Even so, the user's
   * data will still only be tracked anonymously without ability to trace it back to the user.
   *
   */
  clientIdGenerator?: ClientIdGenerator;

  /**
   * The default consent level the first time a user enters a website.
   *
   * @default Anonymous/Necessary
   */
  defaultConsent?: UserConsent;

  /**
   * Configured whether the two purposes personalization and security should be treated
   * as separate purposes, or just considered synonymous with functionality and necessary respectively.
   *
   * The default is to not treat them separately, and this follows the common options in cookie
   * disclaimers.
   *
   * Google Consent Mode v2 has separate flags for personalization and security, which is why
   * you might want to enable the distinction.
   *
   * When a purpose is not treated separately, the become synonymous with their counterpart,
   * and both are set if either is set when the user gives or updates their consent.
   * That is, consent for inactive purposes cannot be controlled independently if not active.
   *
   */
  additionalPurposes?: Pick<DataPurposes, "personalization" | "security">;

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

  /**
   * Mappings of on or more backends that provides variables in the different scopes.
   * If a variable storage is not configured for a scope (such as User) this data will not get stored anywhere.
   */
  storage?: VariableStorageMappings;

  /**
   * The session timeout in minutes.
   *
   * @default 30
   */
  sessionTimeout?: number;

  /**
   * The device session timeout in minutes after the user has closed all tabs and browser windows related to the website.
   * If a user closes all tabs and windows related to your website and then comes back before this timeout it will not trigger a new device session.
   * In particular, this controls when the {@link ViewEvent.landingPage} is set.
   *
   * The difference between the session and device session timeouts is that device sessions are not reset as long as tabs or windows are open even if the user put their computer to sleep for days
   * (cf. the importance of {@link ViewTimingData.visibleTime} and {@link ViewTimingEvent.interactiveTime}).
   *
   * @default 10
   */
  deviceSessionTimeout?: number;
};

export const DEFAULT:
  | Omit<
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
      | "clientIdGenerator"
      | "additionalPurposes"
      | "defaultConsent"
    > &
      Pick<Required<RequestHandlerConfiguration>, "defaultConsent"> = {
  trackerName: "tail",
  cookies: {
    namePrefix: ".tail",
    secure: true,
  },
  debugScript: false,
  sessionTimeout: 30,
  deviceSessionTimeout: 10,
  client: 0 as any, //CLIENT_CONFIG as any,
  clientEncryptionKeySeed: "tailjs",
  cookiePerPurpose: false,
  json: false,
  defaultConsent: {
    classification: "anonymous",
    purposes: {}, // Necessary only.
  },
};
