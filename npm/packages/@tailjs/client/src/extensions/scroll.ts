import { ScrollEvent, cast } from "@tailjs/types";
import { addViewChangedListener, type TrackerExtensionFactory } from "..";
import {
  T,
  defer,
  listen,
  map,
  push,
  relativeScrollPos,
  scrollPos,
  window,
} from "../lib";

export const scroll: TrackerExtensionFactory = {
  id: "scroll",
  setup(tracker) {
    let emitted: Partial<Record<Required<ScrollEvent>["scrollType"], boolean>> =
      {};
    let initialScroll = scrollPos(T);

    addViewChangedListener(() =>
      defer(() => ((emitted = {}), (initialScroll = scrollPos(T))), 250)
    );

    listen(window, "scroll", () => {
      const scroll = scrollPos();
      const offset = relativeScrollPos();

      if (scroll.y >= initialScroll.y) {
        const types: (keyof typeof emitted)[] = [];

        !emitted["fold"] &&
          scroll.y >= initialScroll.y + 200 &&
          ((emitted["fold"] = T), types.push("fold"));

        !emitted["page-middle"] &&
          offset.y >= 0.5 &&
          ((emitted["page-middle"] = T), types.push("page-middle"));

        !emitted["page-end"] &&
          offset.y >= 0.99 &&
          ((emitted["page-end"] = T), types.push("page-end"));

        const mapped = map(types, (scrollType) =>
          cast<ScrollEvent>({
            type: "SCROLL",
            scrollType,
            offset,
          })
        );

        mapped.length && push(tracker, mapped);
      }
    });
  },
};