import fs from "fs";
import http from "http";
import https from "https";
import { resolve, join, basename, dirname } from "path";
import { v4 as uuid } from "uuid";

import type {
  ChangeHandler,
  EngineHost,
  HostResponse,
  HttpRequest,
  LogMessage,
  ResourceEntry,
} from "@tailjs/engine";
import { hash } from "@tailjs/transport";
import { MINUTE, now } from "@tailjs/util";

export class NativeHost implements EngineHost {
  private readonly _rootPath: string;
  private readonly _console: boolean;

  constructor(rootPath: string, console = true) {
    this._rootPath = resolve(rootPath);
    this._console = console;
  }

  async ls(path: string): Promise<ResourceEntry[] | null> {
    path = join(this._rootPath, path);
    if (!path.startsWith(this._rootPath)) {
      throw new Error(`Invalid path (it is outside the root scope).`);
    }
    if (!fs.existsSync(path)) {
      return null;
    }

    const filePaths = await fs.promises.readdir(path);
    const resources: ResourceEntry[] = [];
    for (const path in filePaths) {
      if (!path.startsWith(this._rootPath)) {
        continue;
      }
      const stat = fs.statSync(path);
      const type = stat.isFile()
        ? "file"
        : stat.isDirectory()
        ? "dir"
        : undefined;
      if (!type) {
        continue;
      }

      resources.push({
        created: stat.birthtimeMs,
        modified: stat.mtimeMs,
        path: path.substring(this._rootPath.length),
        // TODO: Check if its actually the case? Probably a good service for consumers.
        readonly: false,
        type,
        name: basename(path),
      });
    }
    return resources;
  }

  private _throttleStats = new Map<
    string,
    [lastEvent: number, epochCount: number, totalCount: number]
  >();

  async log(message: LogMessage) {
    const throttleKey =
      message.throttleKey == null
        ? null
        : message.throttleKey === ""
        ? hash(JSON.stringify(message), 64)
        : message.throttleKey;
    if (throttleKey != null) {
      let throttleStats = this._throttleStats.get(throttleKey);
      if (!throttleStats) {
        throttleStats = [now(), 0, 0];
      } else {
        throttleStats =
          throttleStats[0] < now() + MINUTE
            ? [throttleStats[0], throttleStats[1] + 1, throttleStats[2] + 1]
            : [now(), 0, throttleStats[2] + 1];
      }

      if (throttleStats[2] >= 3) {
        message.message += `\n(This kind of event has occurred ${throttleStats[2]} times since start`;
        if (throttleStats[1] < 3) {
          message.message += ".)";
        } else if (throttleStats[1] === 3) {
          message.message +=
            " - further events of this kind will not be logged for the next minute.)";
        } else {
          return;
        }
      }
    }

    let msg = {
      timestamp: new Date().toISOString(),
      ...message,
    } as any;
    const group = message.group ?? "console";
    if (group === "console" || this._console) {
      switch (message.level) {
        case "debug":
          console.debug(msg);
          break;
        case "warn":
          console.warn(msg);
          break;
        case "error":
          console.error(msg);
          break;
        default:
          console.log(msg);
      }
    }

    msg = JSON.stringify(msg);

    if (group !== "console") {
      let dir = join(this._rootPath, "logs");
      const parts = group.split("/");
      if (parts.length > 1) {
        const newDir = join(dir, ...parts.slice(0, parts.length - 1));
        if (!newDir.startsWith(dir)) {
          throw new Error(`Invalid group name '${group}'.`);
        }
      }
      await fs.promises.mkdir(dir, { recursive: true });
      await fs.promises.appendFile(
        join(dir, `${parts[parts.length - 1]}.json`),
        `${msg}\n`,
        "utf-8"
      );
    }
  }

  read(
    path: string,
    changeHandler?: ChangeHandler<Uint8Array>
  ): Promise<Uint8Array | null> {
    return this._read(path, false, changeHandler);
  }
  readText(
    path: string,
    changeHandler?: ChangeHandler<string>
  ): Promise<string | null> {
    return this._read(path, true, changeHandler);
  }

  async write(path: string, data: Uint8Array): Promise<void> {
    const fullPath = this._resolvePath(path);
    await fs.promises.writeFile(fullPath, data);
  }
  async writeText(path: string, data: string): Promise<void> {
    const fullPath = this._resolvePath(path);
    await fs.promises.writeFile(fullPath, data, "utf-8");
  }

  async delete(path: string): Promise<boolean> {
    const fullPath = this._resolvePath(path);
    if (!fs.existsSync(fullPath)) return false;

    const type = await fs.promises.stat(fullPath);

    if (type.isDirectory()) {
      await fs.promises.rm(fullPath, { recursive: true });
    } else {
      await fs.promises.rm(fullPath);
    }
    return true;
  }

  private _resolvePath(path: string) {
    if (path === "js/tail.debug.map.js") {
      try {
        const resolved = require.resolve("@tailjs/client");
        return join(dirname(resolved), "iife", path.substring(3));
      } catch (e) {
        console.log(
          `${path} is not available - it requires the @tailjs/client package to be installed explicitly.`
        );
      }
    }

    const fullPath = resolve(join(this._rootPath, path));

    if (!fullPath.startsWith(this._rootPath)) {
      throw new Error("The requested path is outside the root.");
    }
    return fullPath;
  }

  private async _read(
    path: string,
    text: boolean,
    changeHandler?: ChangeHandler<any>
  ) {
    const fullPath = this._resolvePath(path);
    if (!fs.existsSync(fullPath)) {
      return null;
    }
    if (changeHandler) {
      fs.watchFile(fullPath, async function listener() {
        try {
          if ((await changeHandler(path, read)) !== true) {
            fs.unwatchFile(fullPath, listener);
            return;
          }
        } catch (e) {
          console.error(e);
          // Don't crash the host with an unhandled async exception.
        }
      });
    }

    return await read();
    async function read() {
      if (text) {
        return (await fs.promises.readFile(fullPath, "utf-8")) as any;
      } else {
        return new Uint8Array(
          (await fs.promises.readFile(fullPath)).buffer
        ) as any;
      }
    }
  }

  public request<Binary extends boolean = false>(
    request: HttpRequest<Binary>
  ): Promise<HostResponse<Binary extends true ? Uint8Array : string>> {
    request.method ??= request.body ? "POST" : "GET";

    return new Promise((resolve, reject) => {
      const tryCatch = <T>(action: () => T) => {
        try {
          return action();
        } catch (e) {
          reject(e);
        }
      };
      tryCatch(() => {
        if (!request) return;
        const req = (request.url.startsWith("https:") ? https : http).request(
          request.url,
          {
            headers: request.headers,
            method: request.method,
            cert: request.x509?.cert
              ? typeof request.x509.cert === "string"
                ? request.x509.cert
                : Buffer.from(request.x509.cert.buffer)
              : void 0,
            key: request.x509?.key,
          },
          (res) => {
            if (!res?.statusCode) {
              reject(new Error("The server did not reply with a status code."));
              return;
            }

            const body: any[] = [];
            res.on("data", (chunk) => tryCatch(() => body.push(chunk)));
            res.on("end", () =>
              tryCatch(() => {
                if (!request) return;
                const response = Buffer.concat(body);

                const headers: Record<string, string> = {};
                const cookies: string[] = [];

                for (let [name, value] of Object.entries(res.headers)) {
                  if (value == null) continue;
                  name = name.toLowerCase();
                  if (name === "set-cookie") {
                    cookies.push(...(Array.isArray(value) ? value : [value]));
                    continue;
                  }
                  headers[name] = Array.isArray(value)
                    ? value.join(", ")
                    : value;
                }

                resolve({
                  status: res.statusCode ?? 502,
                  headers,
                  cookies,
                  body: (request.binary
                    ? new Uint8Array(response)
                    : response.toString("utf-8")) as any,
                });
              })
            );
          }
        );

        req.on("error", (err) => {
          reject(err);
        });

        req.on("timeout", () => {
          req.destroy();
          reject(new Error("Request time out"));
        });

        if (request.body) {
          req.end(request!.body, "utf-8");
        }
      });
    });
  }

  nextId(scope: string): Promise<string> | string {
    // UUID v4, remove hyphens, re-encode as if radix 16 with radix 36 to reduce number of characters further.
    return uuid()
      .replaceAll("-", "")
      .match(/[0-9a-fA-F]{1,13}/g)!
      .map((value) => parseInt(value, 16).toString(36))
      .join("");
  }
}
