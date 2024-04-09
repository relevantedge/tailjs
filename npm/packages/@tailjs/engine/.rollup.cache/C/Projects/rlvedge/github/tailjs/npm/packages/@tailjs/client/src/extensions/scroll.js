import { cast } from "@tailjs/types";
import { addViewChangedListener } from "..";
import { T, defer, listen, map, push, relativeScrollPos, scrollPos, window, } from "../lib";
export const scroll = {
    id: "scroll",
    setup(tracker) {
        let emitted = {};
        let initialScroll = scrollPos(T);
        addViewChangedListener(() => defer(() => ((emitted = {}), (initialScroll = scrollPos(T))), 250));
        listen(window, "scroll", () => {
            const scroll = scrollPos();
            const offset = relativeScrollPos();
            if (scroll.y >= initialScroll.y) {
                const types = [];
                !emitted["fold"] &&
                    scroll.y >= initialScroll.y + 200 &&
                    ((emitted["fold"] = T), types.push("fold"));
                !emitted["page-middle"] &&
                    offset.y >= 0.5 &&
                    ((emitted["page-middle"] = T), types.push("page-middle"));
                !emitted["page-end"] &&
                    offset.y >= 0.99 &&
                    ((emitted["page-end"] = T), types.push("page-end"));
                const mapped = map(types, (scrollType) => cast({
                    type: "SCROLL",
                    scrollType,
                    offset,
                }));
                mapped.length && push(tracker, mapped);
            }
        });
    },
};
//# sourceMappingURL=scroll.js.map