import { TailJsMiddlewareConfiguration, TailJsRouteHandler, TrackerResolver, DisposableTracker } from '@tailjs/node';
export { ConsoleLogger } from '@tailjs/node';
import { NextApiHandler } from 'next';

declare const createApi: (config: TailJsMiddlewareConfiguration | (() => Promise<TailJsMiddlewareConfiguration> | TailJsMiddlewareConfiguration)) => NextApiHandler & {
    api: NextApiHandler;
    routeHandler: TailJsRouteHandler;
    resolveTracker: TrackerResolver & (() => Promise<(DisposableTracker & {
        json<T = void>(payload?: T): Promise<T>;
    }) | undefined>);
    GET: TailJsRouteHandler;
    POST: TailJsRouteHandler;
};

export { createApi };
