import { EventLogger } from "@tailjs/engine";
import type { TailJsMiddlewareConfiguration } from "@tailjs/node";

export * from "./api";

export { Tracker } from "./Tracker";

// Sample extension for "tailjs.config.ts"
export class TailJsConsoleLogger extends EventLogger {
  constructor() {
    super({ console: true });
  }
}

// Re-export  the middleware configuration type to avoid an explicit dependency on @tailjs/node
// in "tailjs.config.ts" (at least with pnpm).
export type TailJsApiConfiguration = TailJsMiddlewareConfiguration;
