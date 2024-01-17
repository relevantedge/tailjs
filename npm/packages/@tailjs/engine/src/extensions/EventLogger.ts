import { TrackedEvent } from "@tailjs/types";
import type { Tracker, TrackerEnvironment, TrackerExtension } from "../shared";

export class EventLogger implements TrackerExtension {
  public readonly name = "event-logger";

  constructor(public readonly configuration: { group: string }) {}

  async post(
    events: TrackedEvent[],
    tracker: Tracker,
    env: TrackerEnvironment
  ): Promise<void> {
    for (const ev of events) {
      env.log({
        group: this.configuration.group,
        level: "info",
        source: this.name,
        data: ev,
      });
    }
  }
}
