import { QUERY_DEVICE } from "@constants";
import {
  HeartbeatEvent,
  LocalID,
  Timestamp,
  UserAgentEvent,
  UserInteractionEvent,
  ViewEndedEvent,
  ViewEvent,
  ViewTimingEvent,
  cast,
  isViewEvent,
} from "@tailjs/types";
import {
  TrackerExtensionFactory,
  detectDeviceType,
  isChangeUserCommand,
} from "..";
import {
  F,
  noopAction as NO_OP,
  T,
  addDependency,
  assign,
  debug,
  del,
  document,
  eventSet,
  forEach,
  getViewportSize,
  isForegroundTab,
  isInternalUrl,
  listen,
  location,
  map,
  mark,
  matchExHash,
  navigator,
  nextId,
  nil,
  now,
  parseDomain,
  parseParameters,
  push,
  registerSharedState,
  registerViewEndAction,
  replace,
  session,
  sharedQueue,
  split,
  timeout,
  timer,
  trackerConfig,
  transpose,
  undefined,
  window,
} from "../lib";

type TabInfo = [
  id: LocalID,
  created: Timestamp,
  navigated: Timestamp,
  views: number
];

let currentViewEvent: ViewEvent | undefined;

export const getCurrentViewId = () => currentViewEvent?.id;
const [addViewChangedListener, viewChanged] = eventSet<[viewId: string]>();
export { addViewChangedListener };

export type ViewMessage = {
  view?: { id: string; timing: UserInteractionEvent["timing"] };
  who?: LocalID;
  vars?: [key: string, value: any, source: string][];
};

let pushPopNavigation: ViewEvent["navigationType"] | undefined;

export type ReferringViewData = [
  viewId: LocalID,
  relatedEventId: LocalID | undefined
];

const referrers = sharedQueue<ReferringViewData>("ref", 10000);
export const pushNavigationSource = (navigationEventId: LocalID) =>
  referrers([currentViewEvent!.id, navigationEventId]);

const totalDuration = timer();
const visibleDuration = timer();
const interactiveDuration = timer();

export const getVisibleDuration = () => visibleDuration();

const [onFrame, callOnFrame] = eventSet<[frame: HTMLIFrameElement]>();
export { onFrame };

const knownFrames = new WeakSet<any>();
const frames = document.getElementsByTagName("iframe");

export const context: TrackerExtensionFactory = {
  id: "context",
  setup(tracker) {
    timeout(
      () =>
        forEach(
          frames,
          (frame) => mark(knownFrames, frame) && callOnFrame(frame)
        ),
      -1000
    ).pulse();

    let isNewTab = T;

    let activations = 1;
    let viewPosted = F; // Don't post heartbeats on hide before the view has been posted.

    const tab = session<TabInfo>("t", (current) => {
      if ((isNewTab = !current)) {
        return [nextId(), now(), now(), 0];
      }
      current[2] = now();
      return current;
    });
    let firstTab = T;
    registerSharedState(
      "first",
      () => F,
      (first) => {
        if (!first) {
          firstTab = F;
          currentViewEvent &&
            del(currentViewEvent, ["firstTab", "landingPage"]);
        }
      }
    );

    let pendingViewEvent = NO_OP;
    let pendingViewEndEvent = NO_OP;

    let currentLocation: string | null = nil;
    const postView = (force = F) => {
      if (
        matchExHash("" + currentLocation, (currentLocation = location.href)) &&
        !force
      ) {
        return;
      }

      pendingViewEvent();
      pendingViewEndEvent();

      totalDuration.reset();
      visibleDuration.reset();
      interactiveDuration.reset();

      session<TabInfo>("t", () => {
        tab[2] = now();
        ++tab[3];
        return tab;
      });

      const { href, domain } = parseDomain(location.href) ?? {};
      currentViewEvent = {
        type: "VIEW",
        timestamp: now(),
        id: nextId(),
        tab: tab[0],
        href,
        path: location.pathname,
        hash: location.hash || undefined,
        domain,
        tabIndex: tab[3],
        viewport: getViewportSize(),
      };
      viewChanged(currentViewEvent.id);

      currentViewEvent.firstTab = firstTab;
      firstTab && tab[3] === 1 && (currentViewEvent.landingPage = T);

      // Query string
      const trySplit = (s: string, sep: string, parts = split(s, sep)) =>
        parts.length > 1 ? parts : nil;

      const ps = parseParameters(replace(location.href, /^[^?]*\??/, ""));
      if (ps) {
        const qs = (currentViewEvent!.queryString = transpose(ps, ([k, v]) => [
          k.toLowerCase(),
          v.length > 1
            ? v
            : trySplit(v[0], "|") ||
              trySplit(v[0], ";") ||
              trySplit(v[0], ",") ||
              v,
        ]));
        map(
          ["source", "medium", "campaign", "term", "content"],
          (p, _) => ((currentViewEvent!.utm ??= {})[p] = qs[`utm_${p}`]?.[0])
        );
      }

      !(currentViewEvent.navigationType = pushPopNavigation) &&
        performance &&
        map(
          performance.getEntriesByType("navigation"),
          (entry: PerformanceNavigationTiming) => {
            currentViewEvent!.redirects = entry.redirectCount;
            currentViewEvent!.navigationType = replace(
              entry.type,
              /\_/g,
              "-"
            ) as any;
          }
        );

      pushPopNavigation = undefined;

      if ((currentViewEvent.navigationType ??= "navigate") === "navigate") {
        // Try find related event and parent tab context if any.
        // And only if navigating (not back/forward/refresh)

        if (isNewTab && isInternalUrl(document.referrer)) {
          const referrer = referrers();

          currentViewEvent.view = referrer?.[0];
          currentViewEvent.related = referrer?.[1];
        }
      }

      // Referrer
      const referrer = document.referrer || nil;
      referrer &&
        !isInternalUrl(referrer) &&
        (currentViewEvent!.externalReferrer = {
          href: referrer,
          domain: parseDomain(referrer)?.domain,
        });

      viewPosted = F;
      pendingViewEvent = registerViewEndAction(
        () => (
          (viewPosted = T),
          push(tracker, currentViewEvent),
          currentViewEvent?.firstTab && push(tracker, { flush: T })
        )
      );
      pendingViewEndEvent = registerViewEndAction(() => {
        push(
          tracker,

          { type: "VIEW_ENDED", timing: {} } as ViewEndedEvent,

          {
            set: { view: undefined },
          }
        );
        isNewTab = F;
      });

      push(tracker, {
        get: {
          view: (view: any) => (currentViewEvent!.definition = view),
          rendered: () => {
            // Allow some extra time for gossiping to figure out if we are the only tab.
            // This will also ensure that the view is set on the event if both `view` and `rendered` are set in the same `set` command.
            timeout(pendingViewEvent, 100);
          },
        },
      });

      tracker.push({
        get: {
          [QUERY_DEVICE]: (value) => {
            if (!value || !isForegroundTab()) return;
            push(
              tracker,
              cast<UserAgentEvent>({
                type: "USER_AGENT",
                hasTouch: navigator.maxTouchPoints > 0,
                userAgent: navigator.userAgent,
                view: currentViewEvent?.id,
                languages: map(
                  navigator.languages,
                  (id, i, parts = split(id, "-")) =>
                    cast<UserAgentEvent["languages"]>({
                      id,
                      language: parts[0],
                      region: parts[1],
                      primary: i === 0,
                      preference: i + 1,
                    })
                ),
                timezone: {
                  iana: Intl.DateTimeFormat().resolvedOptions().timeZone,
                  offset: new Date().getTimezoneOffset(),
                },
                ...detectDeviceType(),
              })
            );
          },
        },
      });
    };

    const interactiveTimeout = timeout();
    listen(
      document,
      ["pointermove", "scroll", "pointerdown", "keydown"],
      () => {
        interactiveDuration(T);
        interactiveTimeout(() => interactiveDuration(F), 10000);
      }
    );

    listen(document, "visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        visibleDuration(F);
        interactiveDuration(F);
      } else {
        visibleDuration(T);
        ++activations;
      }
    });

    listen(
      window,
      "popstate",
      () => ((pushPopNavigation = "back-forward"), postView())
    );
    map(["push", "replace"], (name) => {
      const inner = history[(name += "State")];
      history[name] = (...args: any) => {
        inner.apply(history, args);
        pushPopNavigation = "navigate";
        postView();
      };
    });

    postView();

    const heartbeat = timeout();
    const resetHeartbeat = () =>
      viewPosted &&
      trackerConfig.heartbeatFrequency > 0 &&
      heartbeat(
        () =>
          isForegroundTab() &&
          tracker.push(cast<HeartbeatEvent>({ type: "HEARTBEAT", timing: {} })),
        -trackerConfig.heartbeatFrequency
      );

    resetHeartbeat();

    return {
      processCommand(command) {
        if (isChangeUserCommand(command)) {
          tracker.push(
            command.username
              ? { type: "LOGIN", username: command.username }
              : { type: "LOGOUT" }
          );
          return T;
        }
        return F;
      },
      decorate(event) {
        resetHeartbeat();

        if (!currentViewEvent || isViewEvent(event)) return;
        const view = currentViewEvent?.id,
          ctx = {
            view,
            timing: (event as ViewTimingEvent)?.timing && {
              activations,
              totalTime: totalDuration(),
              visibleTime: visibleDuration(),
              interactiveTime: interactiveDuration(),
            },
          };

        ctx && (assign(event, ctx), addDependency(event, currentViewEvent));
      },
    };
  },
};
