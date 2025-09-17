import {
  ConfiguredComponent,
  ImpressionEvent,
  ImpressionRegionStats,
  ImpressionTextStats,
  ImpressionTrackingOptions,
  TrackingBoundaryData,
  externalReferencesEqual,
  getExternalReferenceKey,
  uniqueReferences,
} from "@tailjs/types";
import {
  Falsish,
  Intervals,
  NoOpFunction,
  T,
  TextStats,
  Timer,
  clock,
  createIntervals,
  createTimer,
  filter,
  forEach,
  get,
  getTextStats,
  map,
  parseBoolean,
  set,
  skip,
  some,
  stringify,
} from "@tailjs/util";
import {
  document,
  getActiveTime,
  getBoundaryData,
  getScreenPos,
  getViewport,
  trackerConfig,
} from ".";
import {
  Tracker,
  ViewDurationTimer,
  createViewDurationTimer,
  getComponentContext,
  getElementInfo,
  getViewTimeOffset,
} from "..";

const intersectionHandler = Symbol();
const intersectionConfiguration = Symbol();

const INTERSECTION_POLL_INTERVAL = 250;

type ImpressionThreshold = [ownRatio: number, viewportRatio: number];

/** The amount of the component that must be visible for the impression to count. */
const IMPRESSION_START: ImpressionThreshold = [0.75, 0.33];

/** The impression stops when only this amount of the component is visible. */
const IMPRESSION_STOP: ImpressionThreshold = [0.25, 0.33];

/** The percentage of the total number of characters contained in the top region. */
const TEXT_REGION_TOP = 0.25;

/* The percentage of the total number of characters before the bottom region. */
const TEXT_REGION_BOTTOM = 0.75;

type ElementImpressionCache = [
  key: string,
  currentComponents: Map<string, ComponentImpressionState>
];

type ImpressionConfiguration = {
  delay: number;
};

type ComponentImpressionState = {
  active: boolean;
  pendingActive: boolean;
  activeTime: Timer;
  viewDuration: ViewDurationTimer;
  impressions: number;
  impressionEvent?: ImpressionEvent;
  unbindPassiveEventSource?: NoOpFunction;
};

const initialState = (): ComponentImpressionState => ({
  active: false,
  pendingActive: false,
  activeTime: createTimer(false, getActiveTime),
  viewDuration: createViewDurationTimer(false),
  impressions: 0,
});

const parseConfiguration = (
  configuration: Falsish | ImpressionTrackingOptions | string
): false | ImpressionConfiguration => (
  typeof configuration === "string" &&
    (configuration = parseBoolean(configuration)),
  configuration
    ? {
        delay:
          configuration === true || configuration.delay == null
            ? trackerConfig.impressionThreshold
            : configuration.delay,
      }
    : false
);

export const createImpressionObserver = (tracker: Tracker) => {
  const observer = new IntersectionObserver(
    (els) => forEach(els, (args) => args.target[intersectionHandler]?.(args))
    // Low thresholds used to be able to handle components larger than view ports.
  );

  const currentIntersections = new Set<() => void>();

  clock({
    callback: () => forEach(currentIntersections, (handler) => handler()),
    frequency: INTERSECTION_POLL_INTERVAL,
    raf: true,
  });

  const constrain = (point: number, max: number, min = 0) =>
    point < min ? min : point > max ? max : point;

  const probeRange = document.createRange();

  return (
    el: Element & { [intersectionConfiguration]?: ElementImpressionCache },
    trackingData: TrackingBoundaryData<true> | undefined
  ) => {
    if (!trackingData) {
      return false;
    }

    const impressionConfiguration = {
      components: map(trackingData.components, (cmp) =>
        cmp.track?.impressions
          ? {
              key: getExternalReferenceKey(cmp),
              config: cmp.track?.impressions,
            }
          : skip
      ),
      config: trackingData?.track?.impressions,
    };
    const configurationKey =
      impressionConfiguration.config ||
      impressionConfiguration.components?.length
        ? stringify(impressionConfiguration)
        : "";

    if (el[intersectionConfiguration]?.[0] === configurationKey) {
      // Nothing changed
      return;
    }

    if (!configurationKey) {
      // Nothing tracked.
      el[intersectionHandler]?.(false);
      delete el[intersectionConfiguration];

      observer.unobserve(el);
      return;
    }

    const previousComponents = el[intersectionConfiguration]?.[1];
    const cache = (el[intersectionConfiguration] = [
      configurationKey,
      new Map(),
    ]);

    const globalConfiguration = parseConfiguration(
      trackingData.track?.impressions
    );

    let components:
      | undefined
      | [
          ConfiguredComponent,
          ImpressionConfiguration,
          ComponentImpressionState
        ][] = map(trackingData?.components, (cmp) => {
      const config = parseConfiguration(
        (cmp as ConfiguredComponent)?.track?.impressions ?? globalConfiguration
      );
      return config
        ? [
            cmp,
            config,
            set(
              cache[1],
              getExternalReferenceKey(cmp)!,
              // Continue state from previous configuration (if any).
              get(previousComponents, getExternalReferenceKey(cmp)!) ??
                // Nope, the component is new.
                initialState()
            ),
          ]
        : skip;
    });

    forEach(
      previousComponents,
      // Unbind previous components not tracked this time.
      ([key, state]) => !cache[1].has(key) && state.unbindPassiveEventSource?.()
    );

    if (!components?.length) {
      return;
    }

    const siblingData = getBoundaryData(el.previousElementSibling);
    if (siblingData) {
      components = filter(
        components,
        (cmp) =>
          // When a React component returns a fragment with multiple DOM elements, we only look at the first.
          // TODO: Refine. This may cause inaccuracies but is considered an edge case (a component with tracked impressions will presumably have a single container most of the time).
          !some(uniqueReferences(siblingData.components), (siblingCmp) =>
            externalReferencesEqual(cmp[0], siblingCmp)
          )
      );
    }

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

      forEach(components, ([cmp, { delay }, state]) => {
        /**
         * The threshold for when an impression becomes active/inactive.
         * They depend on whether the impression is currently active.
         */
        const thresholds = state.active ? IMPRESSION_STOP : IMPRESSION_START;

        /**
         * The smallest of the horizontal and vertical intersection percentage. If this is smaller than the threshold,
         * the component is intuitively not visible (or "impressed", lol).
         */
        const qualified =
          (intersectionHeight > thresholds[0] * viewHeight ||
            verticalIntersection > thresholds[0]) &&
          (intersectionWidth > thresholds[0] * viewWidth ||
            horizontalIntersection > thresholds[0]);

        if (state.pendingActive !== qualified) {
          state.activeTime((state.pendingActive = qualified), true);
        }

        if (
          state.active !==
          (state.active =
            state.pendingActive &&
            state.activeTime() >= delay - INTERSECTION_POLL_INTERVAL)
        ) {
          ++state.impressions;
          state.viewDuration(state.active);
          if (!state.impressionEvent) {
            const contextData = getComponentContext(el, {
              directOnly: T,
              eventType: "impression",
            });

            const filteredComponentContext = {
              ...contextData,
              components: filter(
                contextData?.components,
                (activatedComponent) =>
                  externalReferencesEqual(cmp, activatedComponent)
              ),
            };

            if (!filteredComponentContext.components?.length) {
              return skip;
            }
            state.impressionEvent = {
              type: "impression",
              pos: getScreenPos(el),
              viewport: getViewport(),
              timeOffset: getViewTimeOffset(),
              impressions: state.impressions,
              element: getElementInfo(el),
              ...filteredComponentContext,
            } satisfies ImpressionEvent;
          }

          if (state.impressionEvent) {
            const duration = state.viewDuration();

            state.unbindPassiveEventSource =
              tracker.events.registerEventPatchSource(
                state.impressionEvent,
                () => ({
                  duration,
                  impressions: state.impressions,
                  regions: regions?.[0] && {
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
                }),
                true
              );
          }
        }
      });

      const someActive = some(components, (cmp) => cmp[2].active);

      if (rect.height !== prevHeight) {
        prevHeight = rect.height;
        const text = (el as HTMLElement).textContent;
        ({ boundaries, ...stats } = getTextStats(text ?? "", [
          0,
          TEXT_REGION_TOP,
          TEXT_REGION_BOTTOM,
          1,
        ]));

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
                  boundaries[1] &&
                    updateRegion(
                      0,
                      top - offset,
                      bottom - offset,
                      boundaries[1].readTime
                    );
                } else if (regions[0]?.[4]) {
                  boundaries[2] &&
                    updateRegion(
                      1,
                      regions[0][4],
                      top - offset,
                      boundaries[2].readTime
                    );
                  boundaries[3] &&
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

      if (someActive) {
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
        forEach(regions, (region) => {
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
          let qualified =
            someActive && intersectionBottom - intersectionTop > 0;

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
      set(currentIntersections, poll, isIntersecting);
      !isIntersecting &&
        (forEach(components, ([, , { unbindPassiveEventSource }]) =>
          unbindPassiveEventSource?.()
        ),
        poll());
    };
    observer.observe(el);
  };
};
