import { addTailJsConfiguration, createServerContext } from '@tailjs/node';
export { ConsoleLogger } from '@tailjs/node';
import { headers, cookies } from 'next/headers';

const WIRED = Symbol();
const createApi = (config)=>{
    addTailJsConfiguration(config);
    const { routeHandler, middleware, resolveTracker } = createServerContext({
        matchAnyPath: true
    }, true, {
        resourcesPath: "/tmp"
    });
    return Object.assign(middleware, {
        api: middleware,
        routeHandler,
        resolveTracker: async (req, res)=>{
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
                    body: null
                });
                if (!tracker || tracker[WIRED]) return tracker;
                tracker.dispose = async ()=>{
                    const responseCookies = cookies();
                    for (const cookie of (await tracker.getFinalCookies())){
                        if (!cookie.value) {
                            responseCookies.delete(cookie.name);
                        } else {
                            var _cookie_sameSitePolicy;
                            responseCookies.set({
                                name: cookie.name,
                                value: cookie.value,
                                httpOnly: cookie.httpOnly,
                                maxAge: cookie.maxAge,
                                secure: cookie.secure,
                                sameSite: (_cookie_sameSitePolicy = cookie.sameSitePolicy) === null || _cookie_sameSitePolicy === void 0 ? void 0 : _cookie_sameSitePolicy.toLowerCase()
                            });
                        }
                    }
                };
                tracker.json = async (payload)=>{
                    await tracker.dispose();
                    return payload;
                };
                return tracker;
            }
            return resolveTracker(req, res);
        },
        GET: routeHandler,
        POST: routeHandler
    });
};

export { createApi };
