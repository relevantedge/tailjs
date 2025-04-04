import {
  BUILD_REVISION_QUERY,
  CLIENT_SCRIPT_QUERY,
  CONTEXT_NAV_QUERY,
  EVENT_HUB_QUERY,
  PLACEHOLDER_SCRIPT,
  SCHEMA_QUERY,
  TRACKER_CONFIG_PLACEHOLDER,
} from "@constants";

import defaultSchema from "@tailjs/types/schema";

import clientScripts from "@tailjs/client/script";
import {
  CORE_SCHEMA_NS,
  DataPurposeName,
  DataPurposes,
  isPassiveEvent,
  JsonSchemaAdapter,
  PostRequest,
  PostResponse,
  SignInEvent,
  TrackedEvent,
  TypeResolver,
  UserConsent,
  ValidationError,
  VariableGetResponse,
} from "@tailjs/types";

import { DefaultCryptoProvider } from ".";
import { CommerceExtension, TrackerCoreEvents } from "./extensions";

import {
  CallbackResponse,
  ClientRequest,
  ClientResponseCookie,
  ClientScript,
  CookieMonster,
  DEFAULT,
  EngineHost,
  getDefaultLogSourceName,
  InMemoryStorage,
  isValidationError,
  ParseResult,
  PostError,
  RequestHandlerConfiguration,
  SchemaBuilder,
  serializeLogMessage,
  ServerTrackedEvent,
  Tracker,
  TrackerEnvironment,
  TrackerExtension,
  TrackerExtensionContext,
  TrackerInitializationOptions,
  TrackerPostOptions,
  TrackerServerConfiguration,
  ValidationErrorResult,
  VariableStorageCoordinator,
} from "./shared";

import type { TrackerClientConfiguration } from "@tailjs/client";
import {
  createTransport,
  decodeUtf8,
  defaultJsonTransport,
  httpEncode,
} from "@tailjs/transport";
import {
  createLock,
  deferred,
  DeferredAsync,
  filter2,
  formatError,
  hasKeys2,
  indent2,
  isJsonObject,
  isJsonString,
  isPlainObject,
  isString,
  join2,
  map2,
  match,
  MaybePromise,
  merge2,
  now,
  Nullish,
  obj2,
  parseQueryString,
  parseUri,
  PickRequired,
  ReplaceProperties,
  SimpleObject,
  skip2,
  throwError,
  unwrap,
} from "@tailjs/util";
import { ClientIdGenerator, DefaultClientIdGenerator } from ".";
import { generateClientExternalNavigationScript } from "./lib";

const scripts = {
  production: clientScripts.production,
  debug: clientScripts.debug,
};

export const MAX_CACHE_HEADERS = {
  "cache-control": "private, max-age=2147483648",
} as const; // As long as possible (https://datatracker.ietf.org/doc/html/rfc9111#section-1.2.2).

export let SCRIPT_CACHE_HEADERS = {
  "cache-control": "private, max-age=604800",
} as const; // A week

export type ProcessRequestOptions = {
  /**
   * Any path is considered the main API route.
   * This is useful when rewriting this route from a reverse proxy without having to change the tracker configuration.
   */
  matchAnyPath?: boolean;

  /**
   * The request comes from a trusted context (typically, server-side tracking).
   */
  trustedContext?: boolean;
};

export class RequestHandler {
  private readonly _cookies: CookieMonster;
  private readonly _extensionFactories: (() =>
    | TrackerExtension
    | Promise<TrackerExtension>)[];
  private readonly _lock = createLock();
  private _schema: TypeResolver = null!;
  private readonly _trackerName: string;

  private _extensions: TrackerExtension[];
  private _initialized = false;
  private _script: string;

  private readonly _clientConfig: TrackerClientConfiguration;
  private readonly _config: RequestHandlerConfiguration;
  private readonly _defaultConsent: UserConsent;

  private readonly _host: EngineHost;

  public readonly instanceId: string;

  /** @internal */
  public readonly _cookieNames: {
    consent: string;
    session: string;

    deviceByPurpose: Record<DataPurposeName, string>;
    device: string;
  };

  public readonly endpoint: string;
  public readonly environment: TrackerEnvironment;

  /** @internal */
  public readonly _clientIdGenerator: ClientIdGenerator;

  constructor(config: RequestHandlerConfiguration) {
    let {
      host,
      trackerName,
      endpoint,
      extensions,
      cookies,
      client,
      clientIdGenerator,
      defaultConsent,
    } = (config = merge2({}, [config, DEFAULT], { overwrite: false }));

    this._config = Object.freeze(config);
    this._host = host;

    this._trackerName = trackerName;
    this.endpoint = !endpoint.startsWith("/") ? "/" + endpoint : endpoint;

    this._defaultConsent = defaultConsent;
    this._extensionFactories = filter2(extensions);

    this._cookies = new CookieMonster(cookies);
    this._clientIdGenerator =
      clientIdGenerator ?? new DefaultClientIdGenerator();

    this._cookieNames = {
      consent: cookies.namePrefix + ".consent",
      session: cookies.namePrefix + ".session",
      device: cookies.namePrefix + ".device",
      deviceByPurpose: obj2(DataPurposes.names, (purpose) => [
        purpose,
        cookies.namePrefix + (purpose === "necessary" ? "" : "," + purpose),
      ]),
    };

    this._clientConfig = Object.freeze({
      ...client,
      src: this.endpoint,
      json: this._config.json,
    });
  }

  public async applyExtensions(
    tracker: Tracker,
    context: TrackerExtensionContext
  ) {
    for (const extension of this._extensions) {
      // Call the apply method in post context to let extension do whatever they need before events are processed (e.g. initialize session).
      try {
        await extension.apply?.(tracker, context);
      } catch (e) {
        this._logExtensionError(extension, "apply", e);
      }
    }
  }

  /** @internal */
  public async _validateSignInEvent(tracker: Tracker, event: SignInEvent) {
    if (tracker.trustedContext && !event.evidence) {
      return true;
    }

    for (const extension of this._extensions) {
      if (
        extension.validateSignIn &&
        (await extension.validateSignIn(tracker, event))
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * This method must be called once when all operations have finished on the tracker
   * returned from {@link processRequest} outside the main API route to get the cookies
   * for the response when the tracker has been used externally.
   */
  public async getClientCookies(
    tracker: Tracker | undefined
  ): Promise<ClientResponseCookie[]> {
    if (!tracker) return [];

    await tracker._persist(true);
    return this._cookies.mapResponseCookies(tracker.cookies as any);
  }

  public getClientScripts(
    tracker: DeferredAsync<Tracker>,
    { initialCommands, nonce }: { initialCommands?: any; nonce?: string } = {}
  ) {
    return this._getClientScripts(tracker, true, initialCommands, nonce);
  }

  private _scriptCache: CachedScript[] = [];
  public async initialize() {
    if (this._initialized) return;

    await this._lock(async () => {
      if (this._initialized) return;

      let {
        crypto,
        encryptionKeys,
        schemas,
        storage,
        environment,
        sessionTimeout,
      } = this._config;

      try {
        // Initialize extensions. Defaults + factories.
        this._extensions = [
          new TrackerCoreEvents(),
          new CommerceExtension(),
          ...filter2(
            await Promise.all(
              this._extensionFactories.map(async (factory) => {
                let extension: TrackerExtension | null = null;
                try {
                  return await factory();
                } catch (e) {
                  this._logExtensionError(extension, "factory", e);
                  return null;
                }
              })
            )
          ),
        ];

        // Initialize type resolver from core and extension schemas.
        const schemaBuilder = new SchemaBuilder(schemas, defaultSchema);
        for (const extension of this._extensions) {
          extension.registerTypes?.(schemaBuilder);
        }
        this._schema = new TypeResolver(
          (await schemaBuilder.build(this._host)).map((schema) => ({ schema }))
        );

        // Initialize environment.
        if (!sessionTimeout) {
          return throwError("A session timeout is not configured.");
        }

        storage ??= {};
        for (const extension of this._extensions) {
          extension.patchStorageMappings?.(storage);
        }
        storage.session ??= {
          storage: new InMemoryStorage(),
        };
        storage.device ??= {
          storage: new InMemoryStorage(),
        };

        (storage.ttl ??= {})["session"] ??= sessionTimeout * 60 * 1000;
        (storage.ttl ??= {})["device"] ??= 10 * 1000; // 10 seconds is enough to sort out race conditions.

        (this as any).environment = new TrackerEnvironment(
          this._host,
          crypto ?? new DefaultCryptoProvider(encryptionKeys),
          new VariableStorageCoordinator(
            {
              storage: storage,
              errorLogger: (message) =>
                this.environment.log(this.environment.storage, message),
            },
            this._schema
          ),
          environment
        );

        this.environment._setLogInfo(
          ...this._extensions.map((source) => ({ source, group: "extensions" }))
        );

        (this as any).instanceId =
          this.environment.nextId("request-handler-id");

        if (this._config.debugScript) {
          if (typeof this._config.debugScript === "string") {
            this._script =
              (await this.environment.readText(
                this._config.debugScript,
                async (_, newText) => {
                  const updated = await newText();
                  if (updated) {
                    this._script = updated;
                  }
                  return true;
                }
              )) ??
              throwError(
                `This script '${this._config.debugScript}' does not exist.`
              );
          } else {
            this._script =
              (await this.environment.readText("js/tail.debug.map.js")) ??
              scripts.debug;
          }
        } else {
          this._script = scripts.production;
        }

        // Initialize storage and extensions with the tracker environment.

        await this.environment.storage.initialize?.(this.environment);

        await Promise.all(
          this._extensions.map(async (extension) => {
            try {
              await extension.initialize?.(this.environment);
            } catch (e) {
              this._logExtensionError(extension, "initialize", e);
              throw e;
            }

            return extension;
          })
        );

        this.environment.log(this, {
          level: "info",
          message: "Request handler initialized.",
          details: {
            config: {
              ...this._config,
              extensions: map2(this._extensions, (extension) => extension.id),
            },
          },
        });
      } catch (error) {
        this._host.log(
          serializeLogMessage({
            level: "error",
            message:
              "An error occurred while initializing the request handler.",
            error,
          })
        );
        throw error;
      }

      this._initialized = true;
    });
  }

  private _validateEvents(
    tracker: Tracker,
    events: ParseResult[]
  ): ParseResult[] {
    return map2(events, (ev) => {
      if (isValidationError(ev)) return ev;
      try {
        const eventType = this._schema.getEventType(ev);

        const { trustedContext, consent } =
          tracker._getConsentStateForSession(ev.session) ?? tracker;

        ev = eventType.validate(ev, undefined, {
          trusted: trustedContext,
        }) as TrackedEvent;

        return (
          eventType.censor(ev, {
            trusted: trustedContext,
            consent: consent,
          }) ?? skip2
        );
      } catch (e) {
        return {
          error:
            e instanceof ValidationError
              ? `Invalid data for '${ev.type}' event:\n${indent2(e.message)}`
              : formatError(e),
          source: ev,
        };
      }
    });
  }

  public async post(
    tracker: Tracker,
    eventBatch: TrackedEvent[],
    options: TrackerPostOptions
  ): Promise<PostResponse> {
    const context = { passive: !!options?.passive };
    await this.initialize();

    let parsed = this._validateEvents(tracker, eventBatch);
    const sourceIndices = new Map<{}, number>();
    parsed.forEach((item, i) => {
      sourceIndices.set(item, i);
    });

    await tracker._applyExtensions(options);

    const validationErrors: (ValidationErrorResult & {
      sourceIndex?: number;
    })[] = [];

    function collectValidationErrors(parsed: ParseResult[]) {
      const events: ServerTrackedEvent[] = [];
      for (const item of parsed) {
        if (isValidationError(item)) {
          validationErrors.push({
            // The key for the source index of a validation error may be the error itself during the initial validation.
            sourceIndex:
              sourceIndices.get(item.source) ?? sourceIndices.get(item),
            source: item.source,
            error: item.error,
          });
        } else {
          events.push(item as ServerTrackedEvent);
        }
      }
      return events;
    }

    const validateServerEvents = async (
      parsed: ParseResult[],
      timestamp: number,
      fromClient: boolean
    ): Promise<ParseResult[]> => {
      const results: ParseResult[] = [];
      for (const result of parsed) {
        if (!isValidationError(result)) {
          if (result.timestamp) {
            if (result.timestamp > 0) {
              // Allow events with any timestamp to be posted from trusted contexts.
              if (fromClient && !tracker.trustedContext) {
                results.push({
                  error:
                    "When explicitly specified, timestamps are interpreted relative to current. As such, a positive value would indicate that the event happens in the future which is currently not supported.",
                  source: result,
                });
                continue;
              }
            } else {
              result.timestamp = timestamp + result.timestamp;
            }
          } else {
            result.timestamp = timestamp;
          }
          result.id ??= await tracker.env.nextId();
        }
        results.push(result);
      }

      return results;
    };

    const patchExtensions = this._extensions.filter((ext) => ext.patch);
    const callPatch = async (
      index: number,
      results: ParseResult[]
    ): Promise<ServerTrackedEvent[]> => {
      if (!tracker.session) return [];
      let timestamp = now();
      const validated = await validateServerEvents(
        this._validateEvents(tracker, results),
        timestamp,
        !index
      );
      const events = collectValidationErrors(validated);

      const extension = patchExtensions[index];
      if (!extension) return events;

      try {
        const extensionEvents = await extension.patch!(
          { events },
          async (events) => {
            return await callPatch(index + 1, events);
          },
          tracker,
          context
        );

        timestamp = now();
        return collectValidationErrors(
          await validateServerEvents(
            this._validateEvents(tracker, extensionEvents),
            timestamp,
            false
          )
        );
      } catch (e) {
        this._logExtensionError(extension, "update", e);
        return events;
      }
    };

    const patchedEventBatch = await callPatch(0, parsed);
    const extensionErrors: Record<string, Error> = {};
    if (options.routeToClient) {
      // TODO: Find a way to push these. They are for external client-side trackers.
      tracker._clientEvents.push(...patchedEventBatch);
    } else {
      await Promise.all(
        this._extensions.map(async (extension) => {
          try {
            (await extension.post?.(
              { events: patchedEventBatch },
              tracker,
              context
            )) ?? Promise.resolve();
          } catch (e) {
            extensionErrors[extension.id] =
              e instanceof Error ? e : new Error(e?.toString());
          }
        })
      );
    }

    if (validationErrors.length || hasKeys2(extensionErrors)) {
      throw new PostError(validationErrors, extensionErrors);
    }

    return {};
  }

  private _clientKeys: CachedClientKey[] = [];

  private async _getLegacyClientEncryptionKey(request: ClientRequest) {
    return this._config.clientEncryptionKeySeed
      ? this.environment.hash(
          (this._config.clientEncryptionKeySeed || "") +
            (await this._clientIdGenerator.generateClientId(
              this.environment,
              request,
              true
            )),
          64
        )
      : undefined;
  }

  private async _getClientEncryptionKey(request: ClientRequest) {
    const clientId = await this._clientIdGenerator.generateClientId(
      this.environment,
      request,
      true
    );
    var keyIndex =
      this.environment.hash(clientId, true, false) % this._config.clientKeys!;
    return (this._clientKeys[keyIndex] ??= {
      key: this.environment.hash(
        this._config.clientEncryptionKeySeed! + keyIndex,
        64
      ),
      index: keyIndex,
    });
  }

  private _getConfiguredClientScript(
    key: CachedClientKey | undefined,
    endpoint: string
  ) {
    const keyIndex = key ? key.index : this._config.clientKeys! + 1;
    let cached = this._scriptCache[keyIndex];
    if (cached == null) {
      const clientConfig = {
        ...this._clientConfig,
        src: endpoint, //matchAnyPath ? requestPath : this._clientConfig.src,
        encryptionKey: key?.key,
        dataTags: undefined,
      };

      const tempKey = "" + Math.random();
      const script = this._script.replace(
        `"${TRACKER_CONFIG_PLACEHOLDER}"`,
        JSON.stringify(
          key
            ? httpEncode([
                tempKey,
                createTransport(tempKey)[0](clientConfig, true),
              ])
            : clientConfig
        )
      );

      this._scriptCache[keyIndex] = cached = {
        plain: script,
        br: this._host.compress?.(script, "br"),
        gzip: this._host.compress?.(script, "gzip"),
      };
    }

    return cached;
  }

  public async processRequest(
    request: ClientRequest,
    { matchAnyPath = false, trustedContext = false }: ProcessRequestOptions = {}
  ): Promise<{
    tracker: DeferredAsync<Tracker>;
    response: CallbackResponse | null;
  } | null> {
    if (!request.url) return null;

    let { method, url, headers: sourceHeaders, body, clientIp } = request;
    await this.initialize();
    const { host, path, query } = parseUri(url);

    if (host == null && path == null) {
      return null;
    }

    const headers = Object.fromEntries(
      Object.entries((sourceHeaders ??= {}))
        .filter(([, v]) => !!v)
        .map(([k, v]) => [k.toLowerCase(), join2(v, ",")] as [string, string])
    );

    let trackerInitializationOptions: TrackerInitializationOptions | undefined;

    let trackerSettings = deferred(async () => {
      clientIp ??=
        headers["x-forwarded-for"]?.[0] ??
        obj2(parseQueryString(headers["forwarded"]))?.["for"] ??
        undefined;

      const clientEncryptionKey = await this._getClientEncryptionKey(request);

      return {
        headers,
        host,
        path,
        url,
        queryString: Object.fromEntries(
          Object.entries(query ?? {}).map(([key, value]) => [
            key,
            !value
              ? []
              : Array.isArray(value)
              ? value.map((value) => value || "")
              : [value],
          ])
        ),
        clientIp,
        anonymousSessionReferenceId: this.environment.hash(
          await this._clientIdGenerator.generateClientId(
            this.environment,
            request,
            false
          ),
          128
        ),
        trustedContext,
        requestHandler: this,
        defaultConsent: this._defaultConsent,
        cookies: CookieMonster.parseCookieHeader(headers["cookie"]),
        clientEncryptionKey: this._config.json
          ? undefined
          : clientEncryptionKey,
        transport: this._config.json
          ? defaultJsonTransport
          : createTransport(clientEncryptionKey.key),
        legacyCookieTransport: async () =>
          createTransport(await this._getLegacyClientEncryptionKey(request)), // Cookies are always encrypted.
      } as PickRequired<TrackerServerConfiguration, "transport"> & {
        clientEncryptionKey?: CachedClientKey;
      };
    });

    /**
     * Set trackerInit before calling this or this first time, if something is needed.
     *
     * The reason it is async is if a consuming API wants to use the tracker in its own code.
     * The overhead of initializing the tracker should not be included if it doesn't, and no request was handled from the URL.
     */
    const resolveTracker = deferred(async () =>
      new Tracker(await trackerSettings())._ensureInitialized(
        trackerInitializationOptions
      )
    );

    // This property can be read from external hosts to get the request handler both from an actual tracker and this handle.
    (resolveTracker as any)._requestHandler = this;

    const result = async (
      response: Partial<
        ReplaceProperties<
          CallbackResponse,
          { body: CallbackResponse["body"] | SimpleObject }
        >
      > | null,

      {
        /** Don't write any cookies, changed or not.
         * In situations where we redirect or what we are doing might be interpreted as "link decoration"
         * we don't want the browser to suddenly restrict the age of the user's cookies.
         */
        sendCookies = true,

        /** Send the response as JSON */
        json = false,
      } = {}
    ) => {
      if (response) {
        response.headers ??= {};
        const resolvedTracker = resolveTracker.resolved;
        if (resolvedTracker) {
          if (sendCookies) {
            response.cookies = await this.getClientCookies(resolvedTracker);
          } else {
            await resolvedTracker._persist(false);
          }
        }

        if (isPlainObject(response.body)) {
          response.body =
            response.headers?.["content-type"] === "application/json" ||
            json ||
            this._config.json
              ? JSON.stringify(response.body)
              : (await trackerSettings()).transport[0](response.body, true);
        }

        if (isString(response.body) && !response.headers?.["content-type"]) {
          // This is probably a lie, but we pretend everything is text to avoid preflight.
          (response.headers ??= {})["content-type"] = "text/plain";
        }
      }

      return {
        tracker: resolveTracker,
        response: response as CallbackResponse,
      };
    };

    try {
      let requestPath = path;

      if (requestPath === this.endpoint || (requestPath && matchAnyPath)) {
        let queryValue: string | undefined;

        switch (method.toUpperCase()) {
          case "GET": {
            if ((queryValue = join2(query?.[CLIENT_SCRIPT_QUERY])) != null) {
              return result({
                status: 200,
                body: await this._getClientScripts(resolveTracker, false),

                cacheKey: "external-script",
                headers: {
                  "content-type": "application/javascript",
                  ...SCRIPT_CACHE_HEADERS,
                },
              });
            }

            if ((queryValue = join2(query?.[CONTEXT_NAV_QUERY])) != null) {
              // The user navigated via the context menu in their browser.
              // If the user has an active session we respond with a small script, that will push the request ID
              // that caused the navigation to the other browser tabs.
              // If there is no session it means the user might have shared the link with someone else,
              // and we must not set any cookies or do anything but redirect since it does not count as a visit to the site.

              trackerInitializationOptions = { passive: true };

              const [, requestId, targetUri] =
                match(join2(queryValue), /^([0-9]*)(.+)$/) ?? [];
              if (!targetUri) return result({ status: 400 });

              if (
                !requestId ||
                // We need to initialize the tracker to see if it has a session.
                !(await resolveTracker())?.sessionId
              ) {
                return result(
                  {
                    status: 301, // Permanent redirect. Never invoke this code again.
                    headers: {
                      location: targetUri,
                      ...MAX_CACHE_HEADERS,
                    },
                  },
                  { sendCookies: false }
                );
              }

              return result({
                status: 200,
                body: generateClientExternalNavigationScript(
                  requestId,
                  targetUri
                ),
                headers: {
                  "content-type": "text/html",
                  ...SCRIPT_CACHE_HEADERS,
                  vary: "sec-fetch-dest",
                },
              });
            }

            if ((queryValue = join2(query?.[SCHEMA_QUERY])) != null) {
              let serialized: string;
              if (queryValue === "native") {
                serialized = JSON.stringify(this._schema.definitions, null, 2);
              } else {
                serialized = new JsonSchemaAdapter(
                  CORE_SCHEMA_NS + ":runtime"
                ).serialize(this._schema.schemas);
              }
              return result({
                status: 200,
                body: serialized,
                headers: {
                  "content-type": "application/json",
                },
                cacheKey: "types",
              });
            }

            // Default for GET is to send script.

            // This is set by most modern browsers.
            // It prevents external scripts to try to get a hold of the configuration key via XHR.
            const secDest = headers["sec-fetch-dest"];
            if (secDest && secDest !== "script" && secDest !== "document") {
              return result({
                status: 400,
                body: `Request destination '${secDest}' not allowed.`,
                headers: {
                  ...SCRIPT_CACHE_HEADERS,
                  vary: "sec-fetch-dest",
                },
              });
            }

            const { clientEncryptionKey } = await trackerSettings();
            const script = this._getConfiguredClientScript(
              clientEncryptionKey,
              matchAnyPath ? requestPath : this._clientConfig.src
            );

            const accept =
              headers["accept-encoding"]
                ?.split(",")
                .map((value) => value.toLowerCase().trim()) ?? [];

            const scriptHeaders = {
              "content-type": "application/javascript",
              ...SCRIPT_CACHE_HEADERS,
              vary: "sec-fetch-dest",
            };

            let body: Uint8Array | string | Nullish;
            if (accept.includes("br") && (body = await script.br)) {
              scriptHeaders["content-encoding"] = "br";
            } else if (accept.includes("gzip") && (body = await script.gzip)) {
              scriptHeaders["content-encoding"] = "gzip";
            } else {
              body = script.plain;
            }

            return result({
              status: 200,
              body,
              headers: scriptHeaders,
            });
          }

          case "POST": {
            if ((queryValue = join2(query?.[EVENT_HUB_QUERY])) != null) {
              body = await unwrap(body);

              if (body == null || (!isJsonObject(body) && body.length === 0)) {
                return result({
                  status: 400,
                  body: "No data.",
                });
              }

              try {
                let postRequest: PostRequest<true>;
                let json = false;
                if (
                  this._config.json ||
                  headers["content-type"] === "application/json" ||
                  isJsonString(body) ||
                  isJsonObject(body)
                ) {
                  if (!this._config.json && headers["sec-fetch-dest"]) {
                    // Crime! Deny in a non-helpful way.
                    return result({
                      status: 400,
                      headers: {
                        ...SCRIPT_CACHE_HEADERS,
                        vary: "sec-fetch-dest",
                      },
                    });
                  }
                  json = true;
                  postRequest = isJsonObject(body)
                    ? body
                    : JSON.parse(
                        typeof body === "string" ? body : decodeUtf8(body)
                      );
                } else {
                  const { transport: cipher } = await trackerSettings();
                  postRequest = cipher[1](body)!;
                }

                if (!postRequest.events && !postRequest.variables) {
                  return result({
                    status: 400,
                  });
                }

                trackerInitializationOptions = {
                  deviceId: postRequest.deviceId,
                  deviceSessionId: postRequest.deviceSessionId,
                };

                const resolvedTracker = await resolveTracker();

                let response: PostResponse<true> = {};

                if (postRequest.events) {
                  // This returns a response that may have changed variables in it.
                  // A mechanism for pushing changes without using cookies is still under development,
                  // so this does nothing for the client atm.
                  response = await resolvedTracker.post(postRequest.events, {
                    passive: postRequest.events.every(isPassiveEvent),
                    deviceSessionId: postRequest.deviceSessionId,
                    deviceId: postRequest.deviceId,
                  });
                }

                if (postRequest.variables) {
                  if (postRequest.variables.get) {
                    (response.variables ??= {}).get = (
                      await resolvedTracker
                        .get(postRequest.variables.get, { trusted: false })
                        .all()
                    ).map((result, i) => {
                      if (result && postRequest.variables!.get![i]?.passive) {
                        (result as VariableGetResponse).passive = true;
                      }
                      return result;
                    });
                  }
                  if (postRequest.variables.set) {
                    (response.variables ??= {}).set = await resolvedTracker
                      .set(postRequest.variables.set, { trusted: false })
                      .all();
                  }
                }

                return result(
                  response.variables
                    ? {
                        status: 200,
                        body: response,
                      }
                    : { status: 204 },
                  { json }
                );
              } catch (error) {
                this.environment.log(
                  {
                    group: "system/request-handler",
                    source: "post",
                  },
                  error
                );
                if (error instanceof PostError) {
                  return result({
                    status: Object.keys(error.extensions).length ? 500 : 400,
                    body: error.message,
                    error,
                  });
                }
                throw error;
              }
            }
          }
        }

        return result({
          status: 400,
          body: "Bad request.",
        });
      }
    } catch (error) {
      this.environment.log(this, {
        level: "error",
        message: "Unexpected error while processing request.",
        error,
      });
      console.error("Unexpected error while processing request.", error);
      return result({
        status: 500,
        body: error.toString(),
      });
    } finally {
      try {
        await resolveTracker.resolved?.dispose();
      } catch (error) {
        this.environment.log(this, {
          level: "error",
          message: "Unexpected error while processing request.",
          error,
        });
        console.error("Unexpected error while processing request.", error);
        return result({
          status: 500,
          body: error.toString(),
        });
      }
    }

    return { tracker: resolveTracker, response: null };
  }

  private async _getClientScripts(
    tracker: DeferredAsync<Tracker>,
    html: boolean,
    initialCommands?: any,
    nonce?: string,
    endpoint?: string
  ): Promise<string | undefined> {
    if (!this._initialized) {
      return undefined;
    }

    const trackerScript: string[] = [];
    const wrapTryCatch = (s: string) => `try{${s}}catch(e){console.error(e);}`;

    const trackerRef = this._trackerName;
    if (html) {
      trackerScript.push(PLACEHOLDER_SCRIPT(trackerRef, true));
    }

    const inlineScripts: string[] = [join2(trackerScript)];
    const externalScripts: (ClientScript & { src: string })[] = [];

    for (const extension of this._extensions) {
      const scripts =
        extension.getClientScripts && extension.getClientScripts(tracker);
      for (const script of scripts ?? []) {
        if ("inline" in script) {
          // Prevent errors from preempting other scripts.
          script.inline = wrapTryCatch(script.inline);

          if (script.allowReorder !== false) {
            inlineScripts.push(script.inline);
            return;
          }
        } else {
          externalScripts.push(script);
        }
      }
    }

    if (html) {
      const keyPrefix = this._clientConfig.key
        ? JSON.stringify(this._clientConfig.key) + ","
        : "";

      const resolvedTracker = tracker.resolved;
      if (resolvedTracker) {
        const pendingEvents = resolvedTracker.clientEvents;
        pendingEvents.length &&
          inlineScripts.push(
            `${trackerRef}(${keyPrefix}${join2(
              pendingEvents,
              (event) =>
                typeof event === "string"
                  ? event
                  : resolvedTracker.httpClientEncrypt(event),
              ", "
            )});`
          );
      }
      if (initialCommands) {
        inlineScripts.push(
          `${trackerRef}(${keyPrefix}${
            isString(initialCommands)
              ? JSON.stringify(initialCommands)
              : resolvedTracker?.httpClientEncrypt(initialCommands)
          });`
        );
      }

      externalScripts.push({
        src: `${endpoint ?? this.endpoint}${
          this._trackerName && this._trackerName !== DEFAULT.trackerName
            ? `#${this._trackerName}`
            : ""
        }`,
        defer: true,
      });
    }

    const js = join2(
      [{ inline: join2(inlineScripts) }, ...externalScripts],
      (script) => {
        if ("inline" in script) {
          return html
            ? `<script${nonce ? ` nonce="${nonce}"` : ""}>${
                script.inline
              }</script>`
            : script.inline;
        } else {
          return html
            ? `<script${map2(
                this._config.client?.scriptBlockerAttributes,
                ([key, value]) => ` ${key}="${value.replaceAll('"', "&quot;")}"`
              )?.join("")} src='${script.src}${
                BUILD_REVISION_QUERY ? "?" + BUILD_REVISION_QUERY : ""
              }'${script.defer !== false ? " defer" : ""}></script>`
            : `try{document.body.appendChild(Object.assign(document.createElement("script"),${JSON.stringify(
                { src: script.src, async: script.defer }
              )}))}catch(e){console.error(e);}`;
        }
      }
    );

    return js;
  }

  private _logExtensionError(
    extension: TrackerExtension | null,
    method: string,
    error: any
  ) {
    this.environment.log(extension, {
      level: "error",
      message: `An error occurred when invoking the method '${method}' on the extension ${getDefaultLogSourceName(
        extension
      )}.`,
      group: "extensions",
      error: error,
    });
  }
}

type CachedClientKey = { key: string; index: number };

type CachedScript = {
  br: MaybePromise<Uint8Array | Nullish>;
  gzip: MaybePromise<Uint8Array | Nullish>;
  plain: string;
};
