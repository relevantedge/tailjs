import {
  TailJsMiddlewareConfigurationSource,
  TailJsRouteHandler,
  TrackerResolver,
  addTailJsConfiguration,
  createServerContext,
} from "@tailjs/node";

import type { Tracker } from "@tailjs/engine";
import { NextApiHandler } from "next";

export const createServer = (
  config: TailJsMiddlewareConfigurationSource
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
