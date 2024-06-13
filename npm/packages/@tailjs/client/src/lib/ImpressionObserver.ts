import {
  ConfiguredComponent,
  ImpressionEvent,
  ViewDetails,
} from "@tailjs/types";
import {
  F,
  NoOpFunction,
  T,
  count,
  diff,
  filter,
  forEach,
  map,
  nil,
  push,
  restrict,
  createTimeout,
  MINUTE,
  createIntervals,
  createTimer,
  clock,
  Clock,
  max,
  assign,
  Timer,
} from "@tailjs/util";
import {
  getActiveTime,
  getScreenPos,
  getViewport,
  trackerConfig,
  trackerFlag,
} from ".";
import {
  BoundaryData,
  Tracker,
  createViewDurationTimer,
  getComponentContext,
  getViewTimeOffset,
} from "..";

const intersectionHandler = Symbol();

const INTERSECTION_POLL_INTERVAL = 250;

export const createImpressionObserver = (tracker: Tracker) => {
  const observer = new IntersectionObserver(
    (els) => forEach(els, (args) => args.target[intersectionHandler]?.(args))
    // Low thresholds used to be able to handle components larger than view ports.
  );

  const currentIntersections = new Set<() => void>();

  const monitor = clock({
    callback: () => forEach(currentIntersections, (handler) => handler()),
    frequency: INTERSECTION_POLL_INTERVAL,
    raf: true,
  });

  const constrain = (point: number, max: number, min = 0) =>
    point < min ? min : point > max ? max : point;

  return (el: Element, boundaryData: BoundaryData<true> | undefined) => {
    if (!boundaryData) return;

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

      let active = F;
      let pendingActive = F;
      let impressions = 0;
      let intersecting = F;
      let visiblePercentage = 0;
      let regions:
        | [data: ViewDetails, timer: Timer, pending: boolean, active: boolean][]
        | undefined;

      const visible = [createIntervals(), createIntervals()];

      const viewDuration = createViewDurationTimer(false);
      const activeTime = createTimer(false, getActiveTime);

      let impressionEvents: ImpressionEvent[] | undefined;
      let unbindPassiveEventSources: NoOpFunction[] | undefined;
      // let overlays = map(2, (i) => {
      //   const overlay = document.createElement("div");
      //   overlay.style.cssText = `position:absolute;${i ? "bottom" : "top"}:0;${
      //     i ? "right" : "left"
      //   }:0;background-color:blue`;
      //   el.appendChild(overlay);
      //   return overlay;
      // });

      (el as any).style.border = "1px solid blue";
      (el as any).style.position = "relative";

      const poll = () => {
        const rect = el.getBoundingClientRect();
        const viewWidth = window.innerWidth;
        const viewHeight = window.innerHeight;

        const intersection = [
          constrain(rect.top, viewHeight),
          constrain(rect.right, viewWidth),
          constrain(rect.bottom, viewHeight),
          constrain(rect.left, viewWidth),
        ];

        const intersectionHeight = intersection[2] - intersection[0];
        const intersectionWidth = intersection[1] - intersection[3];

        const verticalIntersection = intersectionHeight / rect.height || 0;
        const horizontalIntersection = intersectionWidth / rect.width || 0;

        /**
         * The threshold for when an impression becomes active/inactive.
         * They depend on whether the impression is currently active.
         */
        const thresholds = active ? [0.25, 0.33] : [0.33, 0.75];
        /**
         * The smallest of the horizontal and vertical intersection percentage. If this is smaller than the threshold,
         * the component is intuitively not visible (or "impressed", lol).
         */

        const qualified =
          (intersectionHeight > thresholds[0] * viewHeight ||
            verticalIntersection > thresholds[0]) &&
          (intersectionWidth > thresholds[0] * viewWidth ||
            horizontalIntersection > thresholds[0]);

        if (pendingActive !== qualified) {
          activeTime((pendingActive = qualified), true);
        }
        if (
          active !==
          (active =
            pendingActive &&
            activeTime() >=
              trackerConfig.impressionThreshold - INTERSECTION_POLL_INTERVAL)
        ) {
          ++impressions;
          viewDuration(active);
          if (!impressionEvents) {
            const innerText = (el as HTMLElement).innerText;
            let text: ImpressionEvent["text"];
            if (innerText?.trim()?.length) {
              text = {
                characters: innerText.match(/\S/gu)?.length,
                words: innerText.match(/\b\w+\b/gu)?.length,
                sentences: innerText.match(/\w.*?[.!?]+(\s|$)/gu)?.length,
              };
              text.words && (text.readingTime = MINUTE * (text.words / 238));
            }

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
                      timeOffset: getViewTimeOffset(),
                      impressions,
                      text,
                      ...getComponentContext(el, T),
                    })) ||
                  nil
              )
            );
            push(tracker, impressionEvents);
          }

          if (impressionEvents?.length) {
            unbindPassiveEventSources = map(impressionEvents, (event) =>
              tracker.events.registerEventPatchSource(event, () => ({
                relatedEventId: event.clientId!,
                duration: viewDuration(),
                impressions: impressions,
                regions: regions && {
                  top: regions[0][0],
                  middle: regions[1][0],
                  bottom: regions[2][0],
                },
              }))
            );
          }
        }

        let horizontalOffset = rect.left < 0 ? -rect.left : 0;
        let verticalOffset = rect.top < 0 ? -rect.top : 0;
        const area = rect.width * rect.height;

        if (active) {
          visiblePercentage =
            (visible[0].push(
              verticalOffset,
              verticalOffset + intersectionHeight
            ) *
              visible[1].push(
                horizontalOffset,
                horizontalOffset + intersectionWidth
              )) /
            area;
        }
        if (rect.height > viewHeight * 1.25 || regions) {
          // The component is larger than the viewport. Time top, mid and bottom regions separately.
          // Also, if it was at some point we keep timing.
          const top = verticalOffset / rect.height;
          const bottom = (verticalOffset + intersectionHeight) / rect.height;
          forEach(
            (regions ??= map(3, () => [
              { seen: false, duration: 0, impressions: 0 },
              createTimer(false, getActiveTime),
              false,
              false,
            ])),
            (region, i) => {
              let qualified =
                active &&
                (i === 0
                  ? top <= 0.25
                  : i === 1
                  ? top <= 0.75 && bottom >= 0.25
                  : bottom >= 0.75);

              if (region[2] !== qualified) {
                region[1]((region[2] = qualified));
              }

              // The region has been visible long enough for the timer to start.
              if (
                // Pending active is different from actual active
                region[3] !== region[2] &&
                (region[3] =
                  // If pending active, we check the timer.
                  region[2] &&
                  // Has the region been visible beyond the threshold?
                  region[1]() >
                    trackerConfig.impressionThreshold -
                      INTERSECTION_POLL_INTERVAL)
              ) {
                region[0].seen = true;
                // One more impression.
                ++region[0].impressions!;
              }

              if (region[3]) {
                // We are active. It doesn't matter that the timer goes below the impression threshold
                // when we reset since we only check for that when inactive.
                // We reset because we need the total active time for the event, hence add the time elapsed
                // since last poll.
                region[0].duration! += region[1](true, true);
              }
            }
          );
        }
        // forEach(overlays, (overlay) => {
        //   (el as any).style.borderColor = overlay.style.backgroundColor = active
        //     ? "green"
        //     : "blue";
        //   overlay.innerText =
        //     visiblePercentage + ", " + JSON.stringify(map(regions, 0), null, 2);
        // });
      };

      el[intersectionHandler] = ({
        isIntersecting,
      }: IntersectionObserverEntry) => {
        assign(currentIntersections, poll, isIntersecting);
        !isIntersecting &&
          (forEach(unbindPassiveEventSources, (unbind) => unbind()), poll());
      };
      observer.observe(el);
    }
  };
};
