import http, { createServer } from "http";
import {
  TailJsMiddlewareRequest,
  TailJsMiddlewareSettings,
  createMiddleware,
} from ".";

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

  if (host) {
    host = host?.replace(/.*:(\d+)$/, (_, hostPort) => {
      port = parseInt(hostPort);
      return "";
    });
    if (port) {
      server.listen(port, host);
    } else {
      server.listen(host);
    }
  } else {
    server.listen(port);
  }
};
