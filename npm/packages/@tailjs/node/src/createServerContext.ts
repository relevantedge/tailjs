import { getClientIp } from "request-ip";

import {
  ClientResponseCookie,
  EventLogger,
  RequestHandler,
  Tracker,
  bootstrap,
} from "@tailjs/engine";
import onHeaders from "on-headers";
import {
  NativeHost,
  TrackerFromRequest,
  TailJsMiddlewareConfiguration,
  TailJsMiddlewareConfigurationSource,
  TailJsMiddlewareRequest,
  TailJsMiddlewareResponse,
  TailJsServerContext,
  TailJsRouteRequest,
} from ".";

let globalResolvers: TailJsMiddlewareConfigurationSource[] = [];
let globalResolversSealed = false;

const resolveConfig = async (resolver: any, config: any) => {
  if (!resolver) return config;

  try {
    if (Array.isArray(resolver)) {
      for (const nestedResolver of resolver) {
        config = {
          ...config,
          ...(await resolveConfig(nestedResolver, config)),
        };
      }
      return config;
    } else if (typeof resolver === "function") {
      return { ...config, ...(await resolver(config)) };
    } else if (resolver.then) {
      return resolveConfig(await resolver, config);
    } else {
      // Probe for ".default" if the configuration came from something webpack that may do this to default exports.
      if (resolver.default) {
        return resolveConfig(resolver.default, config);
      }
      // The resolver is a plain configuration object.
      return { ...config, ...resolver };
    }
  } catch (e) {
    console.error("tailjs: A configuration resolver failed.", e);
  }
};

/**
 * Use this method to add configuration to the middleware before it is created.
 *
 * Note that this assumes you are using the middleware as a singleton
 * which means you should not use this function if you intend to have multiple middleware instances.
 */
export const addTailJsConfiguration = (
  configuration: TailJsMiddlewareConfigurationSource,
  replace = false
) => {
  if (globalResolversSealed) {
    throw new TypeError(
      "The tail.js middleware can no longer be configured at this point since it has already been initialized."
    );
  }
  (replace ? (globalResolvers = []) : globalResolvers).push(configuration);
};

export const createServerContext: {
  (
    settings?: TailJsMiddlewareConfigurationSource,
    initializeOnFirstRequest?: false
  ): Promise<TailJsServerContext>;
  (
    settings: TailJsMiddlewareConfigurationSource,
    initializeOnFirstRequest: true
  ): TailJsServerContext;
  (requestHandler: RequestHandler): TailJsServerContext;
} = (
  config: TailJsMiddlewareConfigurationSource,
  initializeOnFirstRequest = true
): any => {
  const trackerSymbol = Symbol();
  const tailCookies = Symbol();

  let finalConfig: TailJsMiddlewareConfiguration | undefined;
  let requestHandler: RequestHandler | undefined;

  const initializeRequestHandler = async () => {
    finalConfig = await resolveConfig([globalResolvers, config], {});
    globalResolversSealed = true;

    const host = new NativeHost(finalConfig!.resourcesPath ?? "./res");
    finalConfig!.extensions ??= [
      (console.warn(
        "tailjs: No extensions has been configured. Events are only logged to the console."
      ),
      new EventLogger({ group: "events", minimal: true, console: true })),
    ];
    return bootstrap({
      ...finalConfig,
      host,
    });
  };

  if (config instanceof RequestHandler) {
    requestHandler = config;
  } else if (!initializeOnFirstRequest) {
    return initializeRequestHandler().then((requestHandler) =>
      createServerContext(requestHandler)
    );
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
    resolveTracker = false
  ): Promise<any> => {
    try {
      if (!requestHandler) {
        requestHandler = await initializeRequestHandler();
      }

      if (!resolveTracker) {
        next ??= () => {
          response.statusCode = 404;
          response.end(`'${request.url}' is not mapped to any action.`);
        };
      }

      if (!request.url) {
        return await next?.();
      }

      let body = request.body;
      if (!finalConfig?.json && typeof body === "string") {
        body = Uint8Array.from(body, (p) => p.charCodeAt(0));
      }
      const { tracker, response: tailResponse } =
        (await requestHandler!.processRequest(
          {
            method: request.method ?? "GET",
            url: request.url,
            headers: request.headers,
            body,
            clientIp: request.clientIp || getClientIp(request),
          },
          {
            matchAnyPath: !resolveTracker && finalConfig!.matchAnyPath,
            trustedContext: resolveTracker,
          }
        )) ?? {};

      request[trackerSymbol] = tracker;

      if (!resolveTracker && tailResponse) {
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
            requestHandler!.getClientCookies(tracker.resolved)
          )
      );
      return await next?.();
    } catch (e) {
      if (resolveTracker) {
        throw e;
      }

      response.statusCode = 500;
      console.error("tails.js: An error occurred", e);
      response.end("An error ocurred: " + e, "utf8");

      return undefined;
    }
  };

  const routeHandler = async <Resolve extends boolean>(
    request: TailJsRouteRequest,
    resolveTracker: Resolve
  ): Promise<Resolve extends false ? Response : TrackerFromRequest | null> => {
    if (resolveTracker && request[trackerSymbol]) {
      // Use the result we already have on subsequent requests.
      return request[trackerSymbol];
    }
    const responseHeaders: Record<string, any> = {};
    let responseBody: any;

    const requestWrapper: TailJsMiddlewareRequest = {
      url: request.url,
      clientIp: request.ip ?? (request as any).clientIp,
      method: request.method,
      headers: {},
      body: (await request.body?.getReader().read())?.value,
    } as any;
    request.headers.forEach((value, key) => {
      const current = requestWrapper.headers[key];
      requestWrapper.headers[key] =
        current == null
          ? value
          : Array.isArray(current)
          ? [...current, value]
          : [current, value];
    });

    const responseWrapper: TailJsMiddlewareResponse = {
      statusCode: 200,
      getHeader: (name) => responseHeaders[name],
      setHeader: (name, value) => (responseHeaders[name] = value),
      end: (chunk) => (responseBody = chunk),
      writeHead: () => responseWrapper as any,
    };

    await middleware(
      requestWrapper,
      responseWrapper,
      undefined,
      resolveTracker
    );

    if (!resolveTracker) {
      // Trigger the on-head listener.
      responseWrapper.writeHead(responseWrapper.statusCode);

      return new Response(
        responseBody == null ? undefined : new Blob([responseBody]).stream(),
        {
          headers: Object.entries(responseHeaders).flatMap(([key, value]) =>
            value == null
              ? []
              : Array.isArray(value)
              ? value.map((value) => [key, value])
              : [[key, value]]
          ) as [string, string][],
          status: responseWrapper.statusCode ?? 200,
        }
      ) as any;
    }

    const tracker = await requestWrapper[trackerSymbol]?.();

    const cookies = () => requestHandler!.getClientCookies(tracker);

    const updateResponse = (response: Response) => {
      for (const cookie of cookies()) {
        response.headers.append("set-cookie", cookie.headerString);
      }
      return response;
    };

    // Wrapper around Response that adds the tracker headers.
    const response = Object.assign(
      (body?: BodyInit | null, init?: ResponseInit) =>
        updateResponse(new Response(body, init)),
      {
        error: () => updateResponse(Response.error()),
        json: (data: any, init?: ResponseInit) =>
          updateResponse(Response.json(data, init)),
        redirect: (url: string | URL, status?: number) =>
          updateResponse(Response.redirect(url, status)),
      }
    );

    if (tracker) {
      tracker.updateResponse = updateResponse;
    }

    return (request[trackerSymbol] = [tracker, response, cookies]) as any;
  };

  const context: TailJsServerContext = {
    middleware: ((request: any, response: any, next: any) =>
      middleware(request, response, next)) as any,
    routeHandler: async (request) => routeHandler(request, false),
    async resolveTracker(
      request: TailJsMiddlewareRequest | TailJsRouteRequest,
      response?: TailJsMiddlewareResponse
    ) {
      if (response === undefined) {
        return routeHandler(request as TailJsRouteRequest, true);
      }

      if (request[trackerSymbol] === undefined) {
        await middleware(request as any, response!, undefined, true);
        // Null means we tried but nothing came back.
        // This tells us not to invoke the middleware again next time someone asks during this request.
        request[trackerSymbol] ??= null;
      }
      return request[trackerSymbol]?.() ?? undefined;
    },
  };

  return context;
};
