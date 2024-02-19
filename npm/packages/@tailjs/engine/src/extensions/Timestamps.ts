import type { TrackerExtension } from "../shared";

export const Timestamps: TrackerExtension = {
  id: "core-validation",
  async patch(events, next) {
    const now = Date.now();
    return (
      await next(
        events.map((event) => {
          if (event.timestamp) {
            if (event.timestamp > 0) {
              return {
                error:
                  "When explicitly specified, timestamps are interpreted relative to current. As such, a positive value would indicate that the event happens in the future which is currently not supported.",
                source: event,
              };
            }
            event.timestamp = now + event.timestamp;
          } else {
            event.timestamp = now;
          }
          return event;
        })
      )
    ).map((event) => ((event.timestamp ??= now), event));
  },
};
