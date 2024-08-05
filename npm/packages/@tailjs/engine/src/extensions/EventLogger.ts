import type { TrackedEventBatch, Tracker, TrackerExtension } from "../shared";

export class EventLogger implements TrackerExtension {
  public readonly id = "event-logger";

  constructor(
    public readonly configuration: {
      group: string;
      minimal?: boolean;
      console?: boolean;
    }
  ) {}

  async post(events: TrackedEventBatch, tracker: Tracker): Promise<void> {
    for (const ev of events) {
      const data = this.configuration.minimal
        ? { timestamp: ev.timestamp, type: ev.type }
        : ev;
      if (this.configuration.console) {
        console.log(data);
      } else {
        tracker.env.log(this, {
          group: this.configuration.group,
          level: "info",
          source: this.id,
          message: JSON.stringify(data, null, 2),
        });
      }
    }
  }
}
