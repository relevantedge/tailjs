import {
  ConfiguredComponent,
  ImpressionEvent,
  ImpressionRegionStats,
  ImpressionTextStats,
} from "@tailjs/types";
import {
  F,
  Intervals,
  NoOpFunction,
  Nullish,
  T,
  TextStats,
  Timer,
  clock,
  createIntervals,
  createTimer,
  filter2,
  forEach2,
  getTextStats,
  map2,
  restrict,
  set2,
  skip2,
} from "@tailjs/util";
import {
  document,
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

type ImpressionThreshold = [ownRatio: number, viewportRatio: number];

/** The amount of the component that must be visible for the impression to count. */
const IMPRESSION_START = [0.75, 0.33];

/** The impression stops when only this amount of the component is visible. */
const IMPRESSION_STOP = [0.25, 0.33];

/** The percentage of the total number of characters contained in the top region. */
const TEXT_REGION_TOP = 0.25;

/* The percentage of the total number of characters before the bottom region. */
const TEXT_REGION_BOTTOM = 0.75;

export const createImpressionObserver = (tracker: Tracker) => {
  const observer = new IntersectionObserver(
    (els) => forEach2(els, (args) => args.target[intersectionHandler]?.(args))
    // Low thresholds used to be able to handle components larger than view ports.
  );

  const currentIntersections = new Set<() => void>();

  const monitor = clock({
    callback: () => forEach2(currentIntersections, (handler) => handler()),
    frequency: INTERSECTION_POLL_INTERVAL,
    raf: true,
  });

  const constrain = (point: number, max: number, min = 0) =>
    point < min ? min : point > max ? max : point;

  const probeRange = document.createRange();

  return (el: Element, boundaryData: BoundaryData<true> | undefined) => {
    if (!boundaryData) return;

    let components: ConfiguredComponent[] | Nullish;
    if (
      (components = filter2(
        boundaryData?.component,
        (cmp) =>
          // Impression settings from the DOM/CSS are ignored for secondary and inferred components (performance thing)
          cmp!.track?.impressions ||
          (cmp.track?.secondary ?? cmp.inferred) !== T
      ))
    ) {
      if (!components.length) return;

      let active = F;
      let pendingActive = F;
      let impressions = 0;
      let visiblePercentage = 0;
      let regions:
        | [
            data: ImpressionRegionStats,
            timer: Timer,
            pending: boolean,
            active: boolean,
            top: number,
            bottom: number,
            readTime: number,
            intervals: Intervals
          ][]
        | undefined;

      const updateRegion = (
        index: number,
        top: number,
        bottom: number,
        readTime: number
      ) => {
        const region = ((regions ??= [])[index] ??= [
          { duration: 0, impressions: 0 },
          createTimer(false, getActiveTime),
          false,
          false,
          0,
          0,
          0,
          createIntervals(),
        ]);
        region[4] = top;
        region[5] = bottom;
        region[6] = readTime;
      };

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

      // (el as any).style.border = "1px solid blue";
      // (el as any).style.position = "relative";

      let prevHeight = -1;
      let boundaries: TextStats["boundaries"] | undefined;
      let stats: ImpressionTextStats | undefined;

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
        const thresholds = active ? IMPRESSION_STOP : IMPRESSION_START;

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
            impressionEvents = map2(
              components!,
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
                    ...getComponentContext(el, T),
                  })) ||
                skip2
            );
            tracker(impressionEvents);
          }

          if (impressionEvents?.length) {
            const duration = viewDuration();
            unbindPassiveEventSources = map2(impressionEvents, (event) =>
              tracker.events.registerEventPatchSource(event, () => ({
                relatedEventId: event.clientId!,
                duration,
                impressions: impressions,
                regions: regions && {
                  top: regions[0][0],
                  middle: regions[1][0],
                  bottom: regions[2][0],
                },
                seen: visiblePercentage,
                text: stats,
                read:
                  duration.activeTime &&
                  stats &&
                  constrain(
                    duration.activeTime / stats.readTime,
                    visiblePercentage
                  ),
              }))
            );
          }
        }

        if (rect.height !== prevHeight) {
          prevHeight = rect.height;
          const text = (el as HTMLElement).textContent;
          ({ boundaries, ...stats } = getTextStats(
            text ?? "",
            [0, 0.25, 0.75, 1]
          ));

          if (regions || rect.height >= 1.25 * viewHeight) {
            const nodes = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
            let node: Node | null;
            let length = 0;

            let boundaryIndex = 0;
            regions ??= [];
            while (
              boundaryIndex < boundaries.length &&
              (node = nodes.nextNode())
            ) {
              let nodeLength = node.textContent?.length ?? 0;
              length += nodeLength;
              while (length >= boundaries[boundaryIndex]?.offset) {
                // While loop because two boundaries may have the same offset.
                probeRange[boundaryIndex % 2 ? "setEnd" : "setStart"](
                  node,
                  boundaries[boundaryIndex].offset - length + nodeLength
                );

                if (boundaryIndex++ % 2) {
                  const { top, bottom } = probeRange.getBoundingClientRect();
                  const offset = rect.top;

                  if (boundaryIndex < 3) {
                    updateRegion(
                      0,
                      top - offset,
                      bottom - offset,
                      boundaries[1].readTime
                    );
                  } else {
                    updateRegion(
                      1,
                      regions[0][4],
                      top - offset,
                      boundaries[2].readTime
                    );
                    updateRegion(
                      2,
                      top - offset,
                      bottom - offset,
                      boundaries[3].readTime
                    );
                  }
                }
              }
            }
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

        if (regions) {
          forEach2(regions, (region) => {
            const intersectionTop = constrain(
              rect.top < 0 ? -rect.top : 0,
              region[5],
              region[4]
            );
            const intersectionBottom = constrain(
              rect.bottom > viewHeight ? viewHeight : rect.bottom,
              region[5],
              region[4]
            );

            // Zero height, nothing to do.
            let qualified = active && intersectionBottom - intersectionTop > 0;

            const data = region[0];
            data.duration = region[1](qualified);

            if (qualified) {
              region[3] !== (region[3] = qualified) && ++region[0].impressions!;

              data.seen =
                region[7].push(intersectionTop, intersectionBottom) /
                (region[5] - region[4]);
              data.read = constrain(data.duration / region[6], data.seen);
            }
          });
        }
      };

      el[intersectionHandler] = ({
        isIntersecting,
      }: IntersectionObserverEntry) => {
        set2(currentIntersections, poll, isIntersecting);
        !isIntersecting &&
          (forEach2(unbindPassiveEventSources, (unbind) => unbind()), poll());
      };
      observer.observe(el);
    }
  };
};
