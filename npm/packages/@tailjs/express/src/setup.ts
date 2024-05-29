import { TrackerConfiguration } from "@tailjs/client";
import { EventLogger, TrackerExtension, bootstrap } from "@tailjs/engine";
import { NativeHost } from "@tailjs/node";
import express, { type Express } from "express";
import * as fs from "fs/promises";
import * as http from "http";
import * as https from "https";
import { getClientIp } from "request-ip";

export type ServerSettings = {
  cookieKeys?: string[];
  extensions?: TrackerExtension[];
  client?: TrackerConfiguration;
};

/**
 * Configures a server for tail.js, or registers the required middleware for the tracker engine in an existing Express app.
 *
 * @param app An existing Express app or the port you want to use if setting up a stand-alone server (default 7411).
 * @param settings Additional settings for the request handler.
 */
export const tailjs = (
  app: Express | number | null = 7411,
  settings: ServerSettings = {
    cookieKeys: JSON.parse(process.env.TAIL_COOKIE_KEYS || "null"),
  }
) => {
  const env = process.env as Record<
    "PRIVATE_KEY" | "CERTIFICATE" | "PORT" | "DATA" | "SCHEMA",
    string
  >;
  (async () => {
    const host = new NativeHost(process.env.RES ?? "./res");

    const requestHandler = bootstrap({
      host,
      allowUnknownEventTypes: false,
      encryptionKeys: settings.cookieKeys ?? [],
      endpoint: "/_t.js",
      extensions: [
        new EventLogger({ group: "events" }),
        ...(settings.extensions ?? []),
      ],
    });

    await requestHandler.initialize();

    if (app === null || typeof app === "number") {
      const port = app || 7411;
      app = express();
      (app as any).use(express.text());
      (app as any).get("*", async (req, res) => {
        res.send("tail.js server (www.tailjs.org).");
      });

      const key = env.PRIVATE_KEY;
      (key
        ? https.createServer(
            {
              key: await fs.readFile(env.PRIVATE_KEY),
              cert: await fs.readFile(env.CERTIFICATE),
            },
            app as any
          )
        : http.createServer({}, app as any)
      ).listen(port ?? parseInt(env.PORT), () => {
        console.log("tail.js initialized.");
      });
    }

    (app as any).use((req, res, next) => {
      (async () => {
        try {
          const { tracker, response } =
            (await requestHandler.processRequest({
              method: req.method,
              url: req.url,
              headers: req.headers,
              payload: async () => req.body,
              clientIp: getClientIp(req),
            })) ?? {};

          if (response) {
            res.status(response.status);
            for (const name in response.headers) {
              res.setHeader(name, response.headers[name]);
            }

            res.setHeader(
              "set-cookie",
              response.cookies.map((cookie) => cookie.headerString)
            );

            res.send(
              response.body == null
                ? ""
                : typeof response.body === "string"
                ? response.body
                : Buffer.from(response.body.buffer)
            );

            return;
          }
          next();
        } catch (e) {
          res.status(500);
          res.send(e.toString());
        }
      })();
    });
  })();
};

export default tailjs;
