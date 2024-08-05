import { TrackerClientConfiguration } from "@tailjs/client/external";
import type { RequestHandler, TrackerExtension } from "@tailjs/engine";
import { bootstrap } from "@tailjs/engine";
import { NativeHost } from "@tailjs/node";
import type { ConsentEvent, SessionStartedEvent } from "@tailjs/types";
//import { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import fse from "fs-extra";
import type { NextApiRequest } from "next";
import { getClientIp } from "request-ip";

export interface ApiSettings {
  /**
   * The path to where tailjs resources are stored.
   *
   * @default "res"
   */
  resourcePath?: string;

  /**
   * The path where resources are initialized located after deployment.
   *
   * If this is specified and different from {@link resourcePath} the files will be copied when the service starts.
   */
  resourceDeploymentPath?: string;

  /**
   * The URL path to this API endpoint. (e.g. /api/t.js if your api endpoint is exported from pages/api/t.js.ts)
   * @default "/api/t.js"
   */
  endpoint?: string;

  /**
   * Extensions to add to the underlying {@link RequestHandler}.
   *
   * Note that events are not stored anywhere if no extensions are provided.
   * You should consider adding the `@tailjs/maxmind` extension to get geographical information about your visitors,
   * and @tailjs/ravendb as an easy way to collect all events in a way that can be queried and visualized during development,
   * and also production if you are not integrating with, say, Sitecore CDP (in the `@tailjs/sitecore-backends` package).
   *
   */
  extensions?: TrackerExtension[];

  /**
   * Set this to `true` to use the debug client script with a source map in it, or a path relative to the site's `res` folder to use a custom script.
   */
  debugScript?: boolean | string;

  /**
   * This tags will be added to {@link SessionStartedEvent}s and be used to identify and filter nodes, environments or similar in the collected data.
   */
  environmentTags?: string[];

  /**
   * Configures whether tailjs.js is used for managing user consents for non-essential tracking (recommended).
   * If so, non-essential information is only stored if a {@link ConsentEvent} has been sent.
   *
   * @default false
   */
  manageConsents?: boolean;

  /**
   * The key(s) used to encrypt cookie data. The first key is the one currently used.
   * To support rolling encryption previous keys can be added after the current to support decrypting client data from previous keys.
   */
  cookieKeys?: string[];

  /**
   * Configuration for the tracker client.
   */
  client?: TrackerClientConfiguration;

  /**
   * Controls whether logs are written to files in the `res/logs` directory or only printed to the console.
   * The latter is preferable in production environments like Vercel where stdout is collected, and files have very limited use (might even cause issues as they grow).
   *
   * @default true
   */
  consoleLogOnly?: boolean;

  /**
   * Use this in debugging scenarios to delay responses by the specified number of milliseconds.
   */
  simulateSlowServer?: {
    /**
     * Add this latency (ms) to responses.
     */
    latency: number;
  };

  /**
   * Can be used for testing (e.g. faking an IP when testing on a local machine).
   */
  fakeIp?(request: NextApiRequest): string | undefined;
}

export const tailjs = ({
  resourcePath = "res",
  resourceDeploymentPath,
  endpoint = "/api/t.js",
  extensions = [],
  debugScript = process.env.TAIL_F_SCRIPT,
  environmentTags,
  manageConsents,
  cookieKeys = JSON.parse(process.env.TAIL_F_COOKIE_KEYS || "null"),
  simulateSlowServer,
  consoleLogOnly,
  fakeIp,
}: ApiSettings) => {
  if (resourceDeploymentPath && resourceDeploymentPath != resourcePath) {
    if (fs.existsSync(resourceDeploymentPath)) {
      fse.moveSync(resourceDeploymentPath, resourcePath, {
        overwrite: true,
      });
    }
  }

  const host = new NativeHost(resourcePath, consoleLogOnly);

  if (
    typeof debugScript === "string" &&
    ((debugScript = debugScript.trim()),
    debugScript === "true" || debugScript === "false" || debugScript === "")
  ) {
    debugScript = debugScript === "true";
  }

  const requestHandler = bootstrap({
    host,
    encryptionKeys: cookieKeys,
    endpoint,
    extensions,
    debugScript,
    environmentTags,
    //manageConsents,
  });

  return async (req: any, res: any): Promise<void> =>
    // This fails when building with rollup and the dts plugin: (req: NextApiRequest, res: NextApiResponse): Promise<void> =>
    {
      if (!req.url || !req.method) {
        return send(400, "URL and/or method is missing(?!).");
      }

      const url = new URL(req.url, `https://${req.headers.host}`);

      const { response } =
        (await requestHandler.processRequest({
          method: req.method,
          url: url.href,
          headers: Object.fromEntries(
            Object.entries(req.headers)
              .filter(([k, v]) => v != null)
              .map(([k, v]) => [
                k,
                Array.isArray(v) ? v.join(", ") : (v as string),
              ])
          ),
          clientIp: fakeIp?.(req) ?? getClientIp(req),
          body: req.body,
        })) ?? {};

      if (!response) {
        return send(404);
      }

      simulateSlowServer &&
        (await new Promise((resolve) =>
          setTimeout(resolve, simulateSlowServer.latency)
        ));
      if (response.body) {
        return send(response.status, response.body);
      } else {
        return send(response.status);
      }

      function send(status: number, content?: string | Uint8Array | null) {
        res.statusCode = status;

        if (response) {
          for (const [name, value] of Object.entries(response.headers)) {
            res.setHeader(name, value);
          }
          res.setHeader(
            "set-cookie",
            response.cookies?.map((cookie) => cookie.headerString)
          );
        }

        if (content) {
          if (typeof content === "string") {
            res.write(content, "utf-8");
          } else {
            res.write(content);
          }
        }
        res.end();
      }
    };
};
