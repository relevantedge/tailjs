import { ScrollEvent } from "@tailjs/types";
import { T, defer, map2, restrict } from "@tailjs/util";
import { addViewChangedListener, type TrackerExtensionFactory } from "..";
import { listen, relativeScrollPos, scrollPos } from "../lib";

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

        const mapped = map2(types, (scrollType) =>
          restrict<ScrollEvent>({
            type: "scroll",
            scrollType,
            offset,
          })
        );

        mapped.length && tracker(mapped);
      }
    });
  },
};
