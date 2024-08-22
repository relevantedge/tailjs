import { Tracker } from "@tailjs/engine";
import {
  DisposableTracker,
  TailJsMiddlewareConfiguration,
  TailJsRouteHandler,
  TrackerResolver,
  addTailJsConfiguration,
  createServerContext,
} from "@tailjs/node";
import { headers, cookies } from "next/headers";

// The import is required for d.ts generation to work(?!).
import { NextApiHandler } from "next";

const WIRED = Symbol();

export const createApi = (
  config:
    | TailJsMiddlewareConfiguration
    | (() =>
        | Promise<TailJsMiddlewareConfiguration>
        | TailJsMiddlewareConfiguration)
): NextApiHandler & {
  api: NextApiHandler;
  routeHandler: TailJsRouteHandler;
  resolveTracker: TrackerResolver &
    (() => Promise<
      | (DisposableTracker & {
          json<T = void>(payload?: T): Promise<T>;
        })
      | undefined
    >);
  GET: TailJsRouteHandler;
  POST: TailJsRouteHandler;
} => {
  addTailJsConfiguration(config);
  const { routeHandler, middleware, resolveTracker } = createServerContext(
    { matchAnyPath: true },
    true
  );
  return Object.assign(middleware, {
    api: middleware,
    routeHandler,
    resolveTracker: async (req?: any, res?: any) => {
      if (!req) {
        // For server actions. Use NextJs' headers and cookies functions to
        // get what we need to synthesize a proper request.
        //
        // Server actions are (afaik) always POST.
        const requestHeaders = headers();
        const url = requestHeaders.get("referer");
        if (!url) {
          return undefined;
        }

        const tracker = await resolveTracker({
          url,
          method: "POST",
          headers: requestHeaders,
          body: null,
        });

        if (!tracker || tracker[WIRED]) return tracker;

        (tracker as any).dispose = async () => {
          const responseCookies = cookies();
          for (const cookie of await tracker.getFinalCookies()) {
            if (!cookie.value) {
              responseCookies.delete(cookie.name);
            } else {
              responseCookies.set({
                name: cookie.name,
                value: cookie.value,
                httpOnly: cookie.httpOnly,
                maxAge: cookie.maxAge,
                secure: cookie.secure,
                sameSite: cookie.sameSitePolicy?.toLowerCase() as any,
              });
            }
          }
        };

        (tracker as any).json = async (payload?: any) => {
          await tracker.dispose();
          return payload;
        };

        return tracker as any;
      }
      return resolveTracker(req, res);
    },
    GET: routeHandler,
    POST: routeHandler,
  });
};
