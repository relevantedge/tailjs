import { EventLogger } from "@tailjs/engine";

export class ConsoleLogger extends EventLogger {
  constructor() {
    super({ console: true });
  }
}
