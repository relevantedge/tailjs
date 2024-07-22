import {
  CLIENT_SCRIPT_QUERY,
  CONTEXT_NAV_QUERY,
  EVENT_HUB_QUERY,
  INIT_SCRIPT_QUERY,
  SCHEMA_QUERY,
} from "@constants";

import defaultSchema from "@tailjs/types/schema";

import clientScripts from "@tailjs/client/script";
import {
  dataClassification,
  DataPurpose,
  DataPurposeFlags,
  dataPurposes,
  isPassiveEvent,
  PostRequest,
  PostResponse,
  TrackedEvent,
  UserConsent,
  VariableScope,
} from "@tailjs/types";

import { SchemaManager } from "@tailjs/json-schema";

import { CommerceExtension, Timestamps, TrackerCoreEvents } from "./extensions";
import { DefaultCryptoProvider } from "./lib";

import {
  CallbackResponse,
  ClientRequest,
  ClientResponseCookie,
  ClientScript,
  CookieMonster,
  DEFAULT,
  InMemoryStorage,
  isValidationError,
  ParseResult,
  ParsingVariableStorage,
  PostError,
  RequestHandlerConfiguration,
  TrackedEventBatch,
  Tracker,
  TrackerEnvironment,
  TrackerExtension,
  TrackerExtensionContext,
  TrackerInitializationOptions,
  TrackerPostOptions,
  TrackerServerConfiguration,
  ValidationError,
  VariableStorageCoordinator,
} from "./shared";

import { TrackerClientConfiguration } from "@tailjs/client";
import {
  createTransport,
  decodeUtf8,
  from64u,
  httpEncode,
} from "@tailjs/transport";
import {
  array,
  createLock,
  deferred,
  DeferredAsync,
  forEach,
  forEachAsync,
  isJsonObject,
  isPlainObject,
  isString,
  join,
  JsonObject,
  map,
  match,
  merge,
  MINUTE,
  obj,
  parseQueryString,
  parseUri,
  PickRequired,
  rank,
  RecordType,
  ReplaceProperties,
  required,
  some,
  unwrap,
} from "@tailjs/util";
import { ClientIdGenerator, DefaultClientIdGenerator } from ".";
import {
  generateClientBootstrapScript,
  generateClientExternalNavigationScript,
} from "./lib";

const scripts = {
  main: {
    text: clientScripts.main.text,
    gzip: from64u(clientScripts.main.gzip),
    br: from64u(clientScripts.main.br),
  },
  debug: clientScripts.debug,
};

export const MAX_CACHE_HEADERS = {
  "cache-control": "private, max-age=2147483648",
} as const; // As long as possible (https://datatracker.ietf.org/doc/html/rfc9111#section-1.2.2).

export let SCRIPT_CACHE_HEADERS = {
  "cache-control": "private, max-age=604800",
} as const; // A week

export class RequestHandler {
  private readonly _cookies: CookieMonster;
  private readonly _endpoint: string;
  private readonly _extensionFactories: (() =>
    | TrackerExtension
    | Promise<TrackerExtension>)[];
  private readonly _lock = createLock();
  private readonly _schema: SchemaManager;
  private readonly _trackerName: string;

  private _extensions: TrackerExtension[];
  private _initialized = false;
  private _script: undefined | string | Uint8Array;

  /** @internal */
  public readonly _cookieNames: {
    consent: string;
    session: string;

    deviceByPurpose: Record<DataPurpose, string>;
    device: string;
  };
  public readonly environment: TrackerEnvironment;

  private readonly _clientConfig: TrackerClientConfiguration;

  /** @internal */
  public readonly _clientIdGenerator: ClientIdGenerator;

  private readonly _config: RequestHandlerConfiguration;
  private readonly _defaultConsent: UserConsent<true>;

  constructor(config: RequestHandlerConfiguration) {
    let {
      trackerName,
      endpoint,
      extensions,
      cookies,
      client,
      clientIdGenerator,
      defaultConsent,
    } = (config = merge({}, DEFAULT, config));

    this._config = config;

    this._trackerName = trackerName;
    this._endpoint = !endpoint.startsWith("/") ? "/" + endpoint : endpoint;

    this._defaultConsent = {
      level: dataClassification(defaultConsent.level),
      purposes: dataPurposes(defaultConsent.purposes),
    };

    this._extensionFactories = map(extensions);

    this._cookies = new CookieMonster(cookies);
    this._clientIdGenerator =
      clientIdGenerator ?? new DefaultClientIdGenerator();

    this._cookieNames = {
      consent: cookies.namePrefix + ".consent",
      session: cookies.namePrefix + ".session",
      device: cookies.namePrefix + ".device",
      deviceByPurpose: obj(
        dataPurposes.pure.map(
          ([name, flag]) =>
            [
              flag,
              cookies.namePrefix +
                (flag === DataPurposeFlags.Necessary
                  ? ""
                  : "," + dataPurposes.format(name)),
            ] as const
        )
      ),
    };

    this._clientConfig = {
      ...client,
      src: this._endpoint,
    };
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
  public async _validateLoginEvent(userId: string, evidence: string) {
    //TODO
    return true;
  }

  public getClientCookies(tracker: Tracker): ClientResponseCookie[] {
    return this._cookies.mapResponseCookies(tracker.cookies as any);
  }

  public getClientScripts(
    tracker: DeferredAsync<Tracker>,
    { initialCommands, nonce }: { initialCommands?: any; nonce?: string } = {}
  ) {
    return this._getClientScripts(tracker, true, initialCommands, nonce);
  }

  public async initialize() {
    if (this._initialized) return;

    await this._lock(async () => {
      if (this._initialized) return;

      let { host, crypto, environmentTags, encryptionKeys, schemas, storage } =
        this._config;

      schemas ??= [];

      if (
        !schemas.find(
          (schema) => isPlainObject(schema) && schema.$id === "urn:tailjs:core"
        )
      ) {
        schemas.unshift(defaultSchema);
      }

      for (const [schema, i] of rank(schemas)) {
        if (isString(schema)) {
          schemas[i] = JSON.parse(
            required(
              await host.readText(schema),
              () => `The schema path '${schema}' does not exists`
            )
          );
        }
      }

      if (!storage) {
        storage = {
          default: {
            storage: new InMemoryStorage({
              [VariableScope.Session]:
                (this._config.sessionTimeout ?? 30) * MINUTE,
            }),
            schema: "*",
          },
        };
      }

      (this as any)._schema = SchemaManager.create(schemas as JsonObject[]);

      (this as any).environment = new TrackerEnvironment(
        host,
        crypto ?? new DefaultCryptoProvider(encryptionKeys),
        new ParsingVariableStorage(
          new VariableStorageCoordinator({
            schema: this._schema,
            mappings: storage,
          })
        ),
        environmentTags
      );

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
            )) ?? undefined;
        } else {
          this._script = scripts.debug;
        }
      }

      await this.environment.storage.initialize?.(this.environment);

      this._extensions = [
        Timestamps,
        new TrackerCoreEvents(),
        new CommerceExtension(),
        ...(await Promise.all(
          this._extensionFactories.map(async (factory) => {
            let extension: TrackerExtension | null = null;
            try {
              extension = await factory();
              if (extension?.initialize) {
                await extension.initialize?.(this.environment);
                this.environment.log(
                  extension,
                  `The extension ${extension.id} was initialized.`
                );
              }
              return extension;
            } catch (e) {
              this._logExtensionError(
                extension,
                extension ? "update" : "factory",
                e
              );
              return null;
            }
          })
        )),
      ].filter((item) => item != null) as TrackerExtension[];

      this._initialized = true;
    });
  }

  public async post(
    tracker: Tracker,
    eventBatch: TrackedEventBatch,
    options: TrackerPostOptions
  ): Promise<PostResponse> {
    const context = { passive: !!options?.passive };
    let events = eventBatch;
    await this.initialize();

    const validateEvents = (events: ParseResult[]): ParseResult[] =>
      map(events, (ev) =>
        isValidationError(ev)
          ? ev
          : (this._config.allowUnknownEventTypes &&
              !this._schema.getType(ev.type) &&
              ev) ||
            this._schema.patch(ev.type, ev, tracker.consent)
      );

    let parsed = validateEvents(eventBatch);

    const sourceIndices = new Map<{}, number>();

    parsed.forEach((item, i) => {
      sourceIndices.set(item, i);
    });

    await tracker._applyExtensions(options);

    const validationErrors: (ValidationError & { sourceIndex?: number })[] = [];

    function collectValidationErrors(parsed: ParseResult[]) {
      const events: TrackedEvent[] = [];
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
          events.push(item);
        }
      }
      return events;
    }

    const patchExtensions = this._extensions.filter((ext) => ext.patch);
    const callPatch = async (
      index: number,
      results: ParseResult[]
    ): Promise<TrackedEvent[]> => {
      const extension = patchExtensions[index];
      const events = collectValidationErrors(validateEvents(results));
      if (!extension) return events;
      try {
        return collectValidationErrors(
          validateEvents(
            await extension.patch!(
              events,
              async (events) => {
                return await callPatch(index + 1, events);
              },
              tracker,
              context
            )
          )
        );
      } catch (e) {
        this._logExtensionError(extension, "update", e);
        return events;
      }
    };

    eventBatch = await callPatch(0, parsed);
    const extensionErrors: Record<string, Error> = {};
    if (options.routeToClient) {
      // TODO: Find a way to push these. They are for external client-side trackers.
      tracker._clientEvents.push(...events);
    } else {
      //console.log("Posted", eventBatch);
      await Promise.all(
        this._extensions.map(async (extension) => {
          try {
            (await extension.post?.(eventBatch, tracker, context)) ??
              Promise.resolve();
          } catch (e) {
            extensionErrors[extension.id] =
              e instanceof Error ? e : new Error(e?.toString());
          }
        })
      );
    }

    if (validationErrors.length || some(extensionErrors)) {
      throw new PostError(validationErrors, extensionErrors);
    }

    return {};
  }

  public async processRequest(request: ClientRequest): Promise<{
    tracker: DeferredAsync<Tracker>;
    response: CallbackResponse | null;
  } | null> {
    if (!request.url) return null;

    let { method, url, headers: sourceHeaders, body, clientIp } = request;

    await this.initialize();

    const { host, path, query } = parseUri(url);
    if (host == null || path == null) {
      return null;
    }

    const headers = Object.fromEntries(
      Object.entries(sourceHeaders)
        .filter(([, v]) => !!v)
        .map(
          ([k, v]) =>
            [k.toLowerCase(), Array.isArray(v) ? v.join(",") : v] as [
              string,
              string
            ]
        )
    );

    let trackerInitializationOptions: TrackerInitializationOptions | undefined;

    let trackerSettings = deferred(async () => {
      clientIp ??=
        headers["x-forwarded-for"]?.[0] ??
        obj(parseQueryString(headers["forwarded"]))?.["for"] ??
        undefined;

      let clientEncryptionKey: string | undefined;
      if (this._config.clientEncryptionKeySeed) {
        clientEncryptionKey = await this._clientIdGenerator.generateClientId(
          this.environment,
          request,
          true,
          this._config.clientEncryptionKeySeed
        );
      }

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
        clientId: await this._clientIdGenerator.generateClientId(
          this.environment,
          request,
          false,
          this._config.clientEncryptionKeySeed ?? ""
        ),
        requestHandler: this,
        defaultConsent: this._defaultConsent,
        cookies: CookieMonster.parseCookieHeader(headers["cookie"]),
        clientEncryptionKey,
        transport: createTransport(clientEncryptionKey),
      } as PickRequired<TrackerServerConfiguration, "transport"> & {
        clientEncryptionKey?: string;
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
          { body: CallbackResponse["body"] | RecordType }
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
        if (resolveTracker.resolved) {
          const resolvedTracker = await resolveTracker();

          if (sendCookies) {
            await resolvedTracker._persist(true);
            response.cookies = this.getClientCookies(resolvedTracker);
          } else {
            await resolvedTracker._persist(false);
          }
        }

        if (isPlainObject(response.body)) {
          response.body =
            response.headers?.["content-type"] === "application/json" || json
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

      if (requestPath === this._endpoint) {
        requestPath = requestPath.substring(this._endpoint.length);

        let queryValue: string | undefined;

        switch (method.toUpperCase()) {
          case "GET": {
            if ((queryValue = join(query?.[INIT_SCRIPT_QUERY])) != null) {
              // This is set by most modern browsers.
              // It prevents external scripts to try to get a hold of the storage key via XHR.
              const secDest = headers["sec-fetch-dest"];
              if (secDest && secDest !== "script") {
                // Crime! Deny in a non-helpful way.
                return result({
                  status: 400,
                  headers: {
                    ...SCRIPT_CACHE_HEADERS,
                    vary: "sec-fetch-dest",
                  },
                });
              }
              const { clientEncryptionKey } = await trackerSettings();
              return result({
                status: 200,
                body: generateClientBootstrapScript(
                  {
                    ...this._clientConfig,
                    encryptionKey: clientEncryptionKey,
                  },
                  true
                ),
                headers: {
                  "content-type": "application/javascript",
                  ...SCRIPT_CACHE_HEADERS,
                  vary: "sec-fetch-dest",
                },
              });
            }

            if ((queryValue = join(query?.[CLIENT_SCRIPT_QUERY])) != null) {
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

            if ((queryValue = join(query?.[CONTEXT_NAV_QUERY])) != null) {
              // The user navigated via the context menu in their browser.
              // If the user has an active session we respond with a small script, that will push the request ID
              // that caused the navigation to the other browser tabs.
              // If there is no session it means the user might have shared the link with someone else,
              // and we must not set any cookies or do anything but redirect since it does not count as a visit to the site.

              trackerInitializationOptions = { passive: true };

              const [, requestId, targetUri] =
                match(join(queryValue), /^([0-9]*)(.+)$/) ?? [];
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

            if ((queryValue = join(query?.[SCHEMA_QUERY])) != null) {
              return result({
                status: 200,
                body: this._schema.schema.definition,
                headers: {
                  "content-type": "application/json",
                },
                cacheKey: "types",
              });
            }

            // Default for GET is to send script.

            const scriptHeaders = {
              "content-type": "application/javascript",
              ...SCRIPT_CACHE_HEADERS,
            };

            // Check if we are using a debugging script.
            let script = this._script;
            if (!script) {
              const accept =
                headers["accept-encoding"]
                  ?.split(",")
                  .map((value) => value.toLowerCase().trim()) ?? [];
              if (accept.includes("br")) {
                script = scripts.main.br;
                scriptHeaders["content-encoding"] = "br";
              } else if (accept.includes("gzip")) {
                script = scripts.main.gzip;
                scriptHeaders["content-encoding"] = "gzip";
              } else {
                script = scripts.main.text;
              }
            }
            return result({
              status: 200,
              body: script,
              cacheKey: "script",
              headers: scriptHeaders,
            });
          }

          case "POST": {
            if ((queryValue = join(query?.[EVENT_HUB_QUERY])) != null) {
              body = await unwrap(body);

              if (body == null || !isJsonObject(body) || body.length === 0) {
                return result({
                  status: 400,
                  body: "No data.",
                });
              }

              try {
                let postRequest: PostRequest;
                let json = false;
                if (
                  headers["content-type"] === "application/json" ||
                  isJsonObject(body)
                ) {
                  if (
                    headers["sec-fetch-dest"] &&
                    !this._config.allowBrowserJson
                  ) {
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
                    : JSON.parse(decodeUtf8(body));
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
                  deviceSessionId: postRequest.deviceId,
                };

                const resolvedTracker = await resolveTracker();

                const response: PostResponse = {};

                if (postRequest.events) {
                  // This returns a response that may have changed variables in it.
                  // A mechanism for pushing changes without using cookies is still under development,
                  // so this does nothing for the client atm.
                  await resolvedTracker.post(postRequest.events, {
                    passive: postRequest.events.every(isPassiveEvent),
                    deviceSessionId: postRequest.deviceSessionId,
                    deviceId: postRequest.deviceId,
                  });
                }

                if (postRequest.variables) {
                  if (postRequest.variables.get) {
                    (response.variables ??= {}).get = await resolvedTracker.get(
                      postRequest.variables.get,
                      { client: true }
                    ).all;
                  }
                  if (postRequest.variables.set) {
                    (response.variables ??= {}).set = await resolvedTracker.set(
                      postRequest.variables.set,
                      { client: true }
                    ).all;
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
    } catch (ex) {
      console.error("Unexpected error while processing request.", ex);
      return result({
        status: 500,
        body: ex.toString(),
      });
    }

    return { tracker: resolveTracker, response: null };
  }

  private async _getClientScripts(
    tracker: DeferredAsync<Tracker>,
    html: boolean,
    initialCommands?: any,
    nonce?: string
  ): Promise<string | undefined> {
    if (!this._initialized) {
      return undefined;
    }

    const trackerScript: string[] = [];
    const wrapTryCatch = (s: string) => `try{${s}}catch(e){console.error(e);}`;

    const trackerRef = this._trackerName;
    if (html) {
      trackerScript.push(`window.${trackerRef}||(${trackerRef}=[]);`);
    }

    const inlineScripts: string[] = [trackerScript.join("")];
    const otherScripts: ClientScript[] = [];

    await forEachAsync(
      this._extensions.map(
        async (extension) =>
          extension.getClientScripts && extension.getClientScripts(tracker)
      ),
      async (scripts) =>
        forEach(array(await scripts), (script) => {
          if ("inline" in script) {
            // Prevent errors from preempting other scripts.
            script.inline = wrapTryCatch(script.inline);

            if (script.allowReorder !== false) {
              inlineScripts.push(script.inline);
              return;
            }
          }
        })
    );

    if (html) {
      const keyPrefix = this._clientConfig.key
        ? JSON.stringify(this._clientConfig.key) + ","
        : "";

      if (tracker.resolved) {
        const pendingEvents = tracker.resolved.clientEvents;
        pendingEvents.length &&
          inlineScripts.push(
            `${trackerRef}.push(${keyPrefix}${pendingEvents
              .map((event) =>
                typeof event === "string" ? event : JSON.stringify(event)
              )
              .join(", ")});`
          );
      }
      if (initialCommands) {
        inlineScripts.push(
          `${trackerRef}.push(${keyPrefix}${
            isString(initialCommands)
              ? JSON.stringify(initialCommands)
              : httpEncode(initialCommands)
          });`
        );
      }

      otherScripts.push({
        src: `${this._endpoint}${
          this._trackerName && this._trackerName !== DEFAULT.trackerName
            ? `#${this._trackerName}`
            : ""
        }`,
        defer: true,
      });
    }

    const js = [{ inline: inlineScripts.join("") }, ...otherScripts]
      .map((script, i) => {
        if ("inline" in script) {
          return html
            ? `<script${nonce ? ` nonce="${nonce}"` : ""}>${
                script.inline
              }</script>`
            : script.inline;
        } else {
          return html
            ? `<script src='${script.src}?init'${
                script.defer !== false ? " defer" : ""
              }></script>`
            : `try{document.body.appendChild(Object.assign(document.createElement("script"),${JSON.stringify(
                { src: script.src, async: script.defer }
              )}))}catch(e){console.error(e);}`;
        }
      })
      .join("");

    return js;
  }

  private _logExtensionError(
    extension: TrackerExtension | null,
    method: string,
    error: any
  ) {
    this.environment.log(extension, {
      level: "error",
      message: `An error occurred when invoking the method '${method}' on an extension.`,
      group: "extensions",

      error,
    });
  }
}
