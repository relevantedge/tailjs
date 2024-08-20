import {
  TailJsMiddlewareConfiguration,
  TailJsRouteHandler,
  TrackerResolver,
  addTailJsConfiguration,
  createServerContext,
} from "@tailjs/node";

// The import is required for d.ts generation to work(?!).
import type { Tracker } from "@tailjs/engine";
import { NextApiHandler } from "next";

export const createApi = (
  config:
    | TailJsMiddlewareConfiguration
    | (() =>
        | Promise<TailJsMiddlewareConfiguration>
        | TailJsMiddlewareConfiguration)
): NextApiHandler & {
  api: NextApiHandler;
  routeHandler: TailJsRouteHandler;
  tracker: TrackerResolver;
  GET: TailJsRouteHandler;
  POST: TailJsRouteHandler;
} => {
  addTailJsConfiguration(config);
  const { routeHandler, middleware, tracker } = createServerContext(
    { matchAnyPath: true },
    true
  );
  return Object.assign(middleware, {
    api: middleware,
    routeHandler,
    tracker,
    GET: routeHandler,
    POST: routeHandler,
  });
};
