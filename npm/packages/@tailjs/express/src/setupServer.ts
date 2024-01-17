import {
  EventLogger,
  bootstrap,
  NativeHost,
  TrackerExtension,
} from "@tailjs/engine";
import * as fs from "fs/promises";
import express from "express";
import * as https from "https";
import * as http from "http";

export type ServerSettings = {
  cookieKeys?: string[];
  extensions?: TrackerExtension[];
};
export const setupServer = ({
  cookieKeys = JSON.parse(process.env.TAIL_F_COOKIE_KEYS || "null"),
  extensions,
}: ServerSettings = {}) => {
  const env = process.env as Record<
    "PRIVATE_KEY" | "CERTIFICATE" | "PORT" | "DATA" | "SCHEMA",
    string
  >;
  (async () => {
    const host = new NativeHost(process.env.RES ?? "./res");

    const requestHandler = bootstrap({
      host,
      allowUnknownEventTypes: false,
      encryptionKeys: cookieKeys,
      endpoint: "/_t.js",
      extensions: [new EventLogger({ group: "events" }), ...(extensions ?? [])],
    });

    await requestHandler.initialize();

    const app = express();
    app.use(express.text());
    const key = env.PRIVATE_KEY;
    (key
      ? https.createServer(
          {
            key: await fs.readFile(env.PRIVATE_KEY),
            cert: await fs.readFile(env.CERTIFICATE),
          },
          app
        )
      : http.createServer({}, app)
    ).listen(parseInt(env.PORT), () => {
      console.log("~$ tail.js initialized.");
    });

    app.use((req, res, next) => {
      (async () => {
        try {
          const { tracker, response } =
            (await requestHandler.processRequest({
              method: req.method,
              url: req.url,
              headers: req.headers,
              payload: async () => req.body,
              clientIp: "87.62.100.252",
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

    app.get("*", async (req, res) => {
      res.send("tail -f server.");
    });
  })();
};
