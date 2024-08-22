import { Tracker } from "@tailjs/engine";
import {
  TailJsMiddlewareConfiguration,
  TailJsRouteHandler,
  TrackerResolver,
  addTailJsConfiguration,
  createServerContext,
} from "@tailjs/node";
import { headers, cookies } from "next/headers";

// The import is required for d.ts generation to work(?!).
import { NextApiHandler } from "next";
import { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

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
      | (Tracker & {
          /** When using the tracker from a server action, this method must be called before the result is returned. */
          dispose(): void;

          [Symbol.dispose](): void;
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

        const [tracker, , trackerCookies] = await resolveTracker({
          url,
          method: "POST",
          headers: requestHeaders,
          body: null,
        });

        if (tracker) {
          const dispose = ((tracker as any).dispose = () => {
            const responseCookies = cookies();
            for (const cookie of trackerCookies()) {
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
          });
          Symbol.dispose && (tracker[Symbol.dispose] = dispose);
        }
        return tracker as any;
      }
      return resolveTracker(req, res);
    },
    GET: routeHandler,
    POST: routeHandler,
  });
};
