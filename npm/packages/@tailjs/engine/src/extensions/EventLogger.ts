import type { TrackedEventBatch, Tracker, TrackerExtension } from "../shared";

export class EventLogger implements TrackerExtension {
  public readonly id = "event-logger";

  constructor(public readonly configuration: { group: string }) {}

  async post(events: TrackedEventBatch, tracker: Tracker): Promise<void> {
    for (const ev of events) {
      tracker.env.log(this, {
        group: this.configuration.group,
        level: "info",
        source: this.id,
        message: JSON.stringify(ev),
      });
    }
  }
}
