import * as http from "http";
import { getClientIp } from "request-ip";

import {
  BootstrapSettings,
  ClientRequest,
  ClientResponseCookie,
  EventLogger,
  RequestHandler,
  Tracker,
  bootstrap,
} from "@tailjs/engine";
import onHeaders from "on-headers";
import { NativeHost } from ".";

/**
 * The minimal subset of {@link http.IncomingMessage} and the parsed request payload required by the middleware.
 * If a client IP is not specified explicitly, an attempt to resolve it from common headers and NodeJS internals
 * (in other words, you do not need to do this yourself if the request is some variation of a standard {@link http.IncomingMessage} request).
 */
export interface TailJsMiddlewareRequest
  extends Pick<ClientRequest, "clientIp" | "body">,
    Pick<http.IncomingMessage, "url" | "method" | "headers"> {}

export interface TailJsMiddlewareResponse
  extends Pick<
    http.ServerResponse,
    "statusCode" | "setHeader" | "getHeader" | "end" | "writeHead"
  > {}

export type TailJsMiddleware = <T = void>(
  request: TailJsMiddlewareRequest,
  response: TailJsMiddlewareResponse,
  next?: (err?: any) => T
) => T;

export type TailJsMiddlewareConfiguration<Lazy extends boolean = true> = Omit<
  BootstrapSettings,
  "host" | "endpoint"
> & {
  /**
   * The endpoint for the tracker script / API.
   * @default "/_t.js"
   */
  endpoint?: string;

  /**
   * Wait initializing the request handler until the first request.
   *
   * @default true
   */
  lazy?: Lazy;
};

export type TailJsServerContext = {
  endpoint: string;
  middleware: TailJsMiddleware;
  tracker(
    request: TailJsMiddlewareRequest,
    response: TailJsMiddlewareResponse
  ): Promise<Tracker | undefined>;
};

export const createServerContext: {
  (settings?: TailJsMiddlewareConfiguration<true>): TailJsServerContext;
  (
    settings: TailJsMiddlewareConfiguration<false>
  ): Promise<TailJsServerContext>;
  (requestHandler: RequestHandler): TailJsServerContext;
} & {
  defaults: TailJsMiddlewareConfiguration & { endpoint: string };
} = Object.assign(
  (config: any): any => {
    const trackerSymbol = Symbol();
    const tailCookies = Symbol();

    console.log(config);

    let lazy = true;
    let requestHandler: RequestHandler;

    if (!(config instanceof RequestHandler)) {
      config = { ...createServerContext.defaults, ...config };

      lazy = config.lazy !== false;
      const host = new NativeHost(process.env.RES ?? "./res");

      requestHandler = bootstrap({
        ...config,
        endpoint: config.endpoint ?? "/_t.js",
        host,
        extensions: [
          new EventLogger({ group: "events", minimal: true, console: true }),
          ...(config.extensions ?? []),
        ],
      });
    } else {
      requestHandler = config;
    }

    if (!lazy) {
      return requestHandler
        .initialize()
        .then(() => createServerContext(requestHandler));
    }

    const setCookies = (
      response: TailJsMiddlewareResponse,
      cookies?: ClientResponseCookie[]
    ) => {
      let currentCookies: Set<string> | undefined = response[tailCookies];
      if (cookies || currentCookies) {
        let current = response.getHeader("set-cookie");
        current = (
          !current ? [] : Array.isArray(current) ? current : ["" + current]
        ).filter((current) => currentCookies?.has(current) !== true);
        response.setHeader(
          "set-cookie",
          cookies
            ? current.concat(cookies.map((cookie) => cookie.headerString))
            : current
        );
      }
    };

    const middleware = async (
      request: TailJsMiddlewareRequest,
      response: TailJsMiddlewareResponse,
      next?: (err?: any) => any,
      silent = false
    ): Promise<any> => {
      try {
        if (lazy) {
          await requestHandler.initialize();
        }
        if (!silent) {
          next ??= () => {
            response.statusCode = 404;
            response.end(`'${request.url}' is not mapped to any action.`);
          };
        }

        if (!request.url) {
          return await next?.();
        }

        const { tracker, response: tailResponse } =
          (await requestHandler.processRequest({
            method: request.method ?? "GET",
            url: request.url,
            headers: request.headers,
            body: request.body,
            clientIp: request.clientIp || getClientIp(request),
          })) ?? {};

        request[trackerSymbol] = tracker;

        if (tailResponse && !silent) {
          response.statusCode = tailResponse.status;
          for (const name in tailResponse.headers) {
            response.setHeader(name, tailResponse.headers[name]);
          }

          setCookies(response, tailResponse.cookies);

          if (tailResponse.body == null) {
            response.end();
          } else if (typeof tailResponse.body === "string") {
            response.end(tailResponse.body, "utf-8");
          } else if (tailResponse.body instanceof Uint8Array) {
            response.end(Buffer.from(tailResponse.body));
          }
          return;
        }

        onHeaders(
          response as any,
          () =>
            tracker?.resolved &&
            setCookies(
              response,
              requestHandler.getClientCookies(tracker.resolved)
            )
        );
        return await next?.();
      } catch (e) {
        if (silent) {
          throw e;
        }

        response.statusCode = 500;
        console.error("An error occurred", e);
        response.end("An error ocurred: " + e, "utf8");

        return undefined;
      }
    };

    return {
      endpoint: requestHandler.endpoint,
      middleware: (async (request: any, response: any, next: any) =>
        await middleware(request, response, next)) as any,
      async tracker(request, response) {
        if (request[trackerSymbol] === undefined) {
          await middleware(request, response, undefined, true);
          request[trackerSymbol] ??= null; // Null means we tried, but nothing came back.
        }
        return request[trackerSymbol]
          ? await request[trackerSymbol]
          : undefined;
      },
    } as TailJsServerContext;
  },
  { defaults: { endpoint: "/_t.js" } }
);
