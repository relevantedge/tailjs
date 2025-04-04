import type {
  BootstrapSettings,
  ClientRequest,
  ClientResponseCookie,
  Cookie,
  Tracker,
} from "@tailjs/engine";
import * as http from "http";
import { NativeHostSettings } from "./NativeHost";

type MaybePromise<T> = T | Promise<T>;

/**
 * The minimal subset of {@link http.IncomingMessage} and the parsed request payload required by the middleware.
 * If a client IP is not specified explicitly, an attempt to resolve it from common headers and NodeJS internals
 * (in other words, you do not need to do this yourself if the request is some variation of a standard {@link http.IncomingMessage} request).
 */
export interface TailJsMiddlewareRequest
  extends Pick<ClientRequest, "clientIp" | "body">,
    Pick<http.IncomingMessage, "url" | "method" | "headers"> {}

export interface TailJsRouteRequest
  extends Pick<Request, "url" | "method" | "headers" | "body"> {
  ip?: string;
}

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
  extends Omit<BootstrapSettings, "host" | "endpoint">,
    Pick<NativeHostSettings, "logger"> {
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
   * If `false`, an "empty" filesystem is used, that is nothing can get read or written.
   *
   * @default ./res
   */
  resourcesPath?: string | false;
}

export interface DisposableTracker extends Tracker {
  dispose(): Promise<void>;
  [Symbol.asyncDispose](): Promise<void>;
}

export type TailJsMiddlewareConfigurationSource =
  | TailJsMiddlewareConfiguration
  | null
  | undefined
  | TailJsMiddlewareConfigurationResolver
  | TailJsMiddlewareConfigurationSource[]
  | Promise<TailJsMiddlewareConfigurationSource>
  | { default: TailJsMiddlewareConfigurationSource };

export type TrackerFromRequest = Tracker & {
  /** Adds the headers that reflects changes made with the tracker to the response. */
  updateResponse<T extends Response>(response: T): T;
};

export type TrackerResolver = {
  (
    request: TailJsMiddlewareRequest,
    response: TailJsMiddlewareResponse
  ): Promise<DisposableTracker | undefined>;
  (request: TailJsRouteRequest): Promise<
    | (DisposableTracker & {
        writeTo<T extends Response>(response: T): Promise<T>;
        json(payload: any): Promise<Response>;
        getFinalCookies(): Promise<ClientResponseCookie[]>;
      })
    | undefined
  >;
};

export interface TailJsServerContext {
  middleware: TailJsMiddleware;
  routeHandler: TailJsRouteHandler;
  resolveTracker: TrackerResolver;
}

export type TailJsMiddlewareConfigurationResolver = (
  current: TailJsMiddlewareConfiguration
) => MaybePromise<TailJsMiddlewareConfiguration>;
