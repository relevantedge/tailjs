import {
  ConfiguredComponent,
  ImpressionEvent,
  ImpressionTimingEvent,
} from "@tailjs/types";
import {
  F,
  T,
  count,
  createTimer,
  filter,
  forEach,
  map,
  nil,
  push,
  restrict,
  stickyTimeout,
} from "@tailjs/util";
import { Tracker, getComponentContext, getVisibleDuration } from "..";
import { BoundaryData } from "../commands";
import { getScreenPos, getViewport, trackerConfig, trackerFlag } from "../lib";

const intersectionHandler = Symbol();

const createImpressionObserver = (tracker: Tracker) => {
  const observer = new IntersectionObserver(
    (els) =>
      forEach(
        els,
        ({ target, isIntersecting, boundingClientRect, intersectionRatio }) =>
          target[intersectionHandler]?.(
            isIntersecting,
            boundingClientRect,
            intersectionRatio
          )
      ),
    // Low thresholds used to be able to handle components larger than view ports.
    { threshold: [0.05, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.6, 0.75] }
  );

  return (el: Element, boundaryData: BoundaryData<true>) => {
    let components: ConfiguredComponent[] | undefined;
    if (
      (components = filter(
        boundaryData?.component,
        (cmp) =>
          // Impression settings from the DOM/CSS are ignored for secondary and inferred components (performance thing)
          cmp!.track?.impressions ||
          (cmp.track?.secondary ?? cmp.inferred) !== T
      ))
    ) {
      if (!count(components)) {
        return;
      }

      let visible = F;
      let impressions = 0;
      let fold: number;
      const trackImpression = stickyTimeout(trackerConfig.impressionThreshold);
      const timer = createTimer(false, () => getVisibleDuration());
      let impressionEvents: ImpressionEvent[] | undefined;
      let unbindPassiveEventSources: (() => void)[] | undefined;
      el[intersectionHandler] = (
        intersecting: boolean,
        rect: DOMRectReadOnly,
        ratio: number
      ) => {
        intersecting =
          ratio >= 0.75 ||
          (rect.top < (fold = window.innerHeight / 2) && rect.bottom > fold);

        timer(intersecting);
        if (visible !== (visible = intersecting)) {
          //el["style"].border = visible ? "2px solid blue" : "";
          if (visible) {
            trackImpression(() => {
              ++impressions;
              if (!impressionEvents) {
                impressionEvents = filter(
                  map(
                    components,
                    (cmp) =>
                      ((cmp!.track?.impressions ||
                        trackerFlag(
                          el,
                          "impressions",
                          T,
                          (data) => data.track?.impressions
                        )) &&
                        restrict<ImpressionEvent>({
                          type: "impression",
                          pos: getScreenPos(el),
                          viewport: getViewport(),
                          ...getComponentContext(el, T),
                        })) ||
                      nil
                  )
                );
                push(tracker, impressionEvents);
              }

              if (impressionEvents?.length) {
                unbindPassiveEventSources = map(impressionEvents, (event) =>
                  tracker.events.registerPassiveEventSource<ImpressionTimingEvent>(
                    event,
                    (previous) => ({
                      type: "impression_timing",
                      passive: true,
                      relatedEventId: event.clientId!,
                      duration: timer() - (previous?.duration ?? 0),
                      impressions: impressions - (previous?.impressions ?? 0),
                    })
                  )
                );
              }
            });
          } else {
            // Stop timing event updates.
            forEach(unbindPassiveEventSources, (unbind) => unbind());

            // Not visible, clear timeout (if any, maybe the component disappeared to fast again for it to count as an impression).
            trackImpression(false);
          }
        }
      };
      observer.observe(el);
    }
  };
};
