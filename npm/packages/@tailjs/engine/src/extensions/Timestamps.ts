import { mapAsync } from "@tailjs/util";
import type { TrackerExtension } from "../shared";
import { isTrackedEvent } from "@tailjs/types";

export const Timestamps: TrackerExtension = {
  id: "core-validation",
  async patch(events, next, tracker) {
    const now = Date.now();
    return await mapAsync(
      await next(
        await mapAsync(events, async (event) => {
          if (!tracker.sessionId) return;

          event.id = await tracker.env.nextId();

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
      ),
      async (ev) => {
        if (isTrackedEvent(ev)) {
          ev.timestamp ??= now;
          ev.id ??= await tracker.env.nextId();
          return ev;
        }
      }
    );
  },
};
