import type { BootstrapSettings, ClientRequest, Tracker } from "@tailjs/engine";
import * as http from "http";

type MaybePromise<T> = T | Promise<T>;

/**
 * The minimal subset of {@link http.IncomingMessage} and the parsed request payload required by the middleware.
 * If a client IP is not specified explicitly, an attempt to resolve it from common headers and NodeJS internals
 * (in other words, you do not need to do this yourself if the request is some variation of a standard {@link http.IncomingMessage} request).
 */
export interface TailJsMiddlewareRequest
  extends Pick<ClientRequest, "clientIp" | "body">,
    Pick<http.IncomingMessage, "url" | "method" | "headers"> {}

export interface TailJsMiddlewareResponse
  extends Pick<http.ServerResponse, "statusCode" | "getHeader" | "writeHead"> {
  setHeader(name: string, value: string | string[]): void;
  end(chunk?: any, encoding?: string): void;
}

export type TailJsMiddleware = <T = void>(
  request: TailJsMiddlewareRequest,
  response: TailJsMiddlewareResponse,
  next?: (err?: any) => T | Promise<T>
) => Promise<T>;

export type TailJsRouteHandler = (request: Request) => Promise<Response>;

export interface TailJsMiddlewareConfiguration
  extends Omit<BootstrapSettings, "host" | "endpoint"> {
  /**
   * The endpoint for the tracker script / API.
   *
   * If external rewrites are used you can pass the {@link ProcessRequestOptions.matchAnyPath} option
   * to {@link RequestHandler.processRequest} instead of configuring the endpoint explicitly here.
   * @default "/_t.js"
   */
  endpoint?: string;

  /**
   * Match any path as the script API route.
   * These is useful for configuration external rewrites without having to also mirror them in the tail.js configuration.
   */
  matchAnyPath?: boolean;

  /**
   * The path to tail.js resources directory.
   *
   * @default ./res
   */
  resourcesPath?: string;
}

export type TailJsMiddlewareConfigurationSource =
  | TailJsMiddlewareConfiguration
  | null
  | undefined
  | TailJsMiddlewareConfigurationResolver
  | TailJsMiddlewareConfigurationSource[]
  | Promise<TailJsMiddlewareConfigurationSource>
  | { default: TailJsMiddlewareConfigurationSource };

export type TrackerResolver = {
  (
    request: TailJsMiddlewareRequest,
    response: TailJsMiddlewareResponse
  ): Promise<Tracker | undefined>;
  (request: Request): Promise<
    (Tracker & { addHeaders<T extends Response>(response: T): T }) | undefined
  >;
};

export interface TailJsServerContext {
  middleware: TailJsMiddleware;
  routeHandler: TailJsRouteHandler;
  tracker: TrackerResolver;
}

export type TailJsMiddlewareConfigurationResolver = (
  current: TailJsMiddlewareConfiguration
) => MaybePromise<TailJsMiddlewareConfiguration>;
