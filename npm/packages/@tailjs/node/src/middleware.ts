import * as http from "http";
import { getClientIp } from "request-ip";

import {
  BootstrapSettings,
  ClientRequest,
  EventLogger,
  RequestHandler,
  Tracker,
  bootstrap,
} from "@tailjs/engine";
import { DeferredAsync } from "@tailjs/util";
import { NativeHost } from ".";

/**
 * The minimal subset of {@link http.IncomingMessage} and the parsed request payload required by the middleware.
 * If a client IP is not specified explicitly, an attempt to resolve it from common headers and NodeJS internals
 * (in other words, you do not need to do this yourself if the request is some variation of a standard {@link http.IncomingMessage} request).
 */
export interface TailJsMiddlewareRequest
  extends Pick<http.IncomingMessage, "url" | "method" | "headers">,
    Pick<ClientRequest, "clientIp" | "body"> {}

export interface TailJsMiddlewareResponse
  extends Pick<http.ServerResponse, "statusCode" | "setHeader" | "end"> {}

export type TailJsMiddleware = (
  req: TailJsMiddlewareRequest,
  res: TailJsMiddlewareResponse,
  next?: (err?: any) => any
) => void;

export type TrackerResolver = (
  req: http.IncomingMessage
) => Promise<Tracker | undefined>;

export interface TailJsServerContext {
  middleware: TailJsMiddleware;
  tracker: TrackerResolver;
}

export type TailJsMiddlewareSettings = Omit<
  BootstrapSettings,
  "host" | "endpoint"
> & {
  endpoint?: string;
};

const trackerSymbol = Symbol();

export const resolveTracker = (
  req: TailJsMiddlewareRequest
): DeferredAsync<Tracker> | undefined => req[trackerSymbol];

export const createMiddleware: {
  (settings?: TailJsMiddlewareSettings): Promise<TailJsMiddleware>;
  (requestHandler: RequestHandler): Promise<TailJsMiddleware>;
} = async (
  requestHandler: RequestHandler | TailJsMiddlewareSettings = {} as any
): Promise<TailJsMiddleware> => {
  if (!(requestHandler instanceof RequestHandler)) {
    const host = new NativeHost(process.env.RES ?? "./res");

    requestHandler = bootstrap({
      ...requestHandler,
      endpoint: requestHandler.endpoint ?? "/_t.js",
      host,
      extensions: [
        new EventLogger({ group: "events" }),
        ...(requestHandler.extensions ?? []),
      ],
    });
  }

  await requestHandler.initialize();

  return async (req, res, next) => {
    try {
      if (!req.url) {
        return next?.();
      }

      const { tracker, response } =
        (await requestHandler.processRequest({
          method: req.method ?? "GET",
          url: req.url,
          headers: req.headers,
          body: req.body,
          clientIp: req.clientIp || getClientIp(req),
        })) ?? {};

      req[trackerSymbol] = tracker;
      if (response) {
        res.statusCode = response.status;
        for (const name in response.headers) {
          res.setHeader(name, response.headers[name]);
        }

        response.cookies &&
          res.setHeader(
            "set-cookie",
            response.cookies.map((cookie) => cookie.headerString)
          );

        if (response.body == null) {
          res.end();
        } else if (typeof response.body === "string") {
          res.end(response.body, "utf-8");
        } else if (response.body instanceof Uint8Array) {
          res.end(Buffer.from(response.body));
        }

        return;
      }
      return next?.();
    } catch (e) {
      res.statusCode = 500;
      console.error("An error occurred", e);
      res.end("An error ocurred: " + e, "utf8");
    }
  };
};
