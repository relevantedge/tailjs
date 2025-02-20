// import type { TrackerClientConfiguration } from "@tailjs/client/external";
// import { CLIENT_CONFIG } from "@tailjs/client/external";

import { type TrackerClientConfiguration } from "@tailjs/client/external";
import {
  JsonSchemaAdapter,
  SchemaDefinition,
  UserConsent,
  type DataPurposes,
} from "@tailjs/types";
import {
  add2,
  AllRequired,
  ellipsis,
  forEach2,
  get2,
  JsonObject,
  required,
  throwError,
} from "@tailjs/util";
import { ClientIdGenerator } from ".";
import {
  CryptoProvider,
  EngineHost,
  TrackerEnvironmentSettings,
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
   * The schemas defining the available events and variables.
   * If the tail.js core schema is not included here, it will automatically be added.
   *
   * Reasons for explicitly including it includes overriding the classifications and purposes of the properties.
   */
  schemas?: SchemaDefinition[];

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
  client?: TrackerClientConfiguration;

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

  /** Settings for the tracker environment. */
  environment?: TrackerEnvironmentSettings;
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
      | "environment"
    > &
      Pick<
        Required<RequestHandlerConfiguration>,
        "environment" | "defaultConsent"
      > = {
  trackerName: "tail",
  cookies: {
    namePrefix: ".tail",
    secure: true,
  },
  debugScript: false,
  sessionTimeout: 30,
  client: {
    scriptBlockerAttributes: {
      "data-cookieconsent": "ignore",
    },
  } satisfies Partial<TrackerClientConfiguration> as any,
  clientEncryptionKeySeed: "tailjs",
  cookiePerPurpose: false,
  json: false,
  defaultConsent: {
    classification: "anonymous",
    purposes: {}, // Necessary only.
  },

  environment: {
    idLength: 12,
  },
};

export type SchemaPatchFunction = (
  schema: SchemaDefinition | undefined
) => void;

export type SchemaFormat = "native" | "json-schema";
export class SchemaBuilder {
  private readonly _collected: {
    source: string | JsonObject | SchemaDefinition;
    type: SchemaFormat;
  }[] = [];

  private readonly _patches = new Map<string, SchemaPatchFunction[]>();
  private readonly _coreSchema: SchemaDefinition | undefined;

  public constructor(
    initialSchemas?: SchemaDefinition[],
    coreSchema?: SchemaDefinition
  ) {
    this._coreSchema = coreSchema;
    if (initialSchemas?.length) {
      this._collected.push(
        ...initialSchemas.map(
          (schema) => ({ source: schema, type: "native" } as const)
        )
      );
    }
  }

  public registerSchema(path: string, type?: SchemaFormat): this;
  public registerSchema(definition: SchemaDefinition): this;
  public registerSchema(
    definition: Record<string, any>,
    type: SchemaFormat
  ): this;
  public registerSchema(source: any, type: SchemaFormat = "native") {
    this._collected.push({ source, type });
    return this;
  }

  /**
   * Can be used to patch another schema, e.g. to change privacy settings.
   *
   * If the intended target schema is not present, `undefined` is passed which gives an opportunity to do nothing or throw an error.
   */
  public patchSchema(namespace: string, patch: SchemaPatchFunction) {
    get2(this._patches, namespace, () => []).push(patch);
  }

  private _applyPatches(schemas: SchemaDefinition[]) {
    const usedPatches = new Set<SchemaPatchFunction>();
    for (const schema of schemas) {
      forEach2(this._patches.get(schema.namespace), (patch) => {
        usedPatches.add(patch);
        patch(schema);
      });
    }
    forEach2(this._patches, ([, patches]) =>
      forEach2(patches, (patch) => !usedPatches.has(patch) && patch(undefined))
    );
  }

  public async build(host: EngineHost): Promise<SchemaDefinition[]> {
    let schemas: SchemaDefinition[] = [];
    for (let { source, type } of this._collected) {
      if (typeof source === "string") {
        source = JSON.parse(
          required(
            await host.readText(source),
            `The schema definition file "${source}" does not exist.`
          )
        ) as JsonObject;
      }
      if (type === "json-schema") {
        schemas.push(...JsonSchemaAdapter.parse(source));
        continue;
      }
      if (!("namespace" in source)) {
        throwError(
          `The definition ${ellipsis(
            JSON.stringify(source),
            40,
            true
          )} is not a tail.js schema definition. The namespace property is not present.`
        );
      }
      schemas.push(source as SchemaDefinition);
    }
    const usedNamespaces = new Set<string>();
    for (const schema of schemas) {
      if (!add2(usedNamespaces, schema.namespace)) {
        throwError(
          `A schema with the namespace '${schema.namespace}' has been registered more than once.`
        );
      }
    }

    if (this._coreSchema) {
      const coreSchema =
        schemas.find(
          (schema) => schema.namespace === this._coreSchema?.namespace
        ) ?? this._coreSchema;

      if (schemas[0] !== coreSchema) {
        schemas = [
          coreSchema,
          ...schemas.filter((schema) => schema !== coreSchema),
        ];
      }
    }

    this._applyPatches(schemas);
    return schemas;
  }
}
