import { EventLogger } from "@tailjs/engine";

/** Logs collected tracker events to the console. */
export class ConsoleLogger extends EventLogger {
  constructor() {
    super({ console: true });
  }
}
