import http, { createServer } from "http";
import { TailJsMiddlewareSettings, createMiddleware } from ".";

export const serve = async ({
  host,
  port,
  ...settings
}: TailJsMiddlewareSettings &
  (
    | { host?: string; port?: undefined }
    | { port?: number; host?: undefined }
  ) = {}) => {
  settings.endpoint ??= "/";

  const middleware = await createMiddleware(settings);

  const server = createServer(
    (req: http.IncomingMessage & { body?: any }, res) => {
      const chunks: any[] = [];
      req.on("data", (chunk) => {
        chunk.push(chunk);
      });

      req.on("end", () => {
        req.body = Buffer.concat(chunks) as any;
        if (req.headers["content-type"] === "application/json") {
          req.body = req.body.toString("utf8");
        }

        middleware(req, res);
      });

      req.on("error", (error) => {
        res.statusCode = 500;
        res.end(error?.toString());
      });
    }
  );

  server.on("listening", () => {
    console.log(`Tail.js server listening on ${host ?? "0.0.0.0:" + port}`);
  });

  if (host) {
    server.listen(host);
  } else {
    server.listen((port ??= 7412));
  }
};
