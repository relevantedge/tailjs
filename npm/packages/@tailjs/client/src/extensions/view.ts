import { SCOPE_INFO_KEY } from "@constants";

import {
  LocalID,
  View,
  ViewEvent,
  ViewTimingData,
  isEventPatch,
  isViewEvent,
} from "@tailjs/types";
import {
  F,
  T,
  add,
  array,
  clock,
  createEvent,
  createTimer,
  forEach,
  map,
  nil,
  now,
  parseQueryString,
  parseUri,
  push,
  replace,
} from "@tailjs/util";
import { TrackerExtensionFactory, isChangeUserCommand } from "..";
import { tracker } from "../initializeTracker";
import {
  TAB_ID,
  addPageVisibleListener,
  getActiveTime,
  getViewport,
  isInternalUrl,
  listen,
  matchExHash,
  nextId,
  parseDomain,
  setLocalVariables,
  tryGetVariable,
} from "../lib";

export let currentViewEvent: ViewEvent | undefined;

export const getCurrentViewId = () => currentViewEvent?.clientId;

let pushPopNavigation: ViewEvent["navigationType"] | undefined;

const referrerKey = {
  scope: "shared",
  key: "referrer",
} as const;

export const pushNavigationSource = (
  navigationEventId: LocalID,
  consumed?: () => void
) => {
  tracker.variables.set({
    ...referrerKey,
    value: [getCurrentViewId()!, navigationEventId],
  });

  consumed &&
    tracker.variables.get({
      // Grr! Intellisense won't use the constant scope and key values if `...referrerKey`.
      scope: referrerKey.scope,
      key: referrerKey.key,
      result: (current: any, previous: any, poll) =>
        current?.value
          ? poll()
          : previous?.value?.[1] === navigationEventId && consumed(),
    });
};

const totalDuration = createTimer();
const visibleDuration = createTimer();

let activations = 1;

export const getVisibleDuration = () => visibleDuration();

const [addViewChangedListener, dispatchViewChanged] =
  createEvent<[viewEvent: ViewEvent]>();

export { addViewChangedListener };

export const createViewDurationTimer = (started?: boolean) => {
  const totalTime = createTimer(started, totalDuration);
  const visibleTime = createTimer(started, visibleDuration);
  const activeTime = createTimer(started, getActiveTime);
  const activationsCounter = createTimer(started, () => activations);
  return (toggle?: boolean, reset?: boolean): ViewTimingData => ({
    totalTime: totalTime(toggle, reset),
    visibleTime: visibleTime(toggle, reset),
    activeTime: activeTime(toggle, reset),
    activations: activationsCounter(toggle, reset),
  });
};

const timer = createViewDurationTimer();
export const getViewTimeOffset = () => timer();

const [addFrameListenerInternal, callOnFrame] =
  createEvent<[frame: HTMLIFrameElement]>();
export const onFrame: typeof addFrameListenerInternal = (
  listener,
  triggerCurrent
) => {
  triggerCurrent &&
    forEach(frames as any as Iterable<HTMLIFrameElement>, (frame) =>
      listener(frame, () => false)
    );
  return addFrameListenerInternal(listener);
};
//export { addFrameListener as onFrame };

const knownFrames = new WeakSet<any>();
const frames = document.getElementsByTagName("iframe");

export const context: TrackerExtensionFactory = {
  id: "context",
  setup(tracker) {
    clock(
      () =>
        forEach(
          frames as any as Iterable<HTMLIFrameElement>,
          (frame) => add(knownFrames, frame) && callOnFrame(frame)
        ),
      1000
    ).trigger();

    // View definitions may be loaded asynchronously both before and after navigation happens.
    // This means the `definition` property of the current view event is updated independently of its creation.
    // If the event has already been sent, and additional patch event is sent with the definition.
    // When a definition has been associated with the current view event, it will not be changed.
    // Instead any new view definition that arrives before the next navigation is assumed to be for the next view event.

    let pendingViewDefinition: View | undefined;

    tracker.variables.get({
      scope: "view",
      key: "view",
      result: (definition, _, poll) => {
        if (
          currentViewEvent == null ||
          !definition?.value ||
          currentViewEvent?.definition
        ) {
          // Buffer for next navigation.
          pendingViewDefinition = definition?.value;
        } else {
          currentViewEvent.definition = definition.value;
          if (currentViewEvent.metadata?.posted) {
            // Send the definition as a patch because the view event has already been posted.
            tracker.events.postPatch(currentViewEvent, {
              definition: pendingViewDefinition,
            });
          }
        }

        return poll();
      },
    });

    let viewIndex =
      tryGetVariable({ scope: "tab", key: "viewIndex" })?.value ?? 0;
    let tabIndex = tryGetVariable({ scope: "tab", key: "tabIndex" })?.value;

    if (tabIndex == null) {
      tabIndex =
        tryGetVariable({ scope: "shared", key: "tabIndex" })?.value ??
        // If we are the only tab, we'll see if we can get the number of previous tabs in the session
        // from the session info variable.
        (tryGetVariable({ scope: "session", key: SCOPE_INFO_KEY })?.value
          ?.tabs as number) ??
        0;
      setLocalVariables(
        {
          scope: "tab",
          key: "tabIndex",
          value: tabIndex,
        },
        {
          scope: "shared",
          key: "tabIndex",
          value: tabIndex + 1,
        }
      );
    }

    let currentLocation: string | null = nil;

    const postView = (force = F) => {
      if (
        matchExHash("" + currentLocation, (currentLocation = location.href)) &&
        !force
      ) {
        return;
      }

      const {
        source: href,
        scheme,
        host,
      } = parseUri(location.href + "", true, true);
      currentViewEvent = {
        type: "view",
        timestamp: now(),
        clientId: nextId(),
        tab: TAB_ID,
        href,
        path: location.pathname,
        hash: location.hash || undefined,
        domain: { scheme, host },
        tabNumber: tabIndex + 1,
        tabViewNumber: viewIndex + 1,
        viewport: getViewport(),
        duration: timer(undefined, true),
      };

      tabIndex === 0 && (currentViewEvent.firstTab = T);
      tabIndex === 0 && viewIndex === 0 && (currentViewEvent.landingPage = T);

      setLocalVariables({ scope: "tab", key: "viewIndex", value: ++viewIndex });

      const qs = parseQueryString(location.href);
      map(
        ["source", "medium", "campaign", "term", "content"],
        (p, _) =>
          ((currentViewEvent!.utm ??= {})[p] = array(qs[`utm_${p}`])?.[0])
      );

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

        const referrer = tryGetVariable(referrerKey)?.value;

        if (referrer && isInternalUrl(document.referrer)) {
          currentViewEvent.view = referrer?.[0];
          currentViewEvent.relatedEventId = referrer?.[1];
          tracker.variables.set({ ...referrerKey, value: undefined });
        }
      }

      // Referrer
      const referrer = document.referrer || nil;
      referrer &&
        !isInternalUrl(referrer) &&
        (currentViewEvent!.externalReferrer = {
          href: referrer,
          domain: parseDomain(referrer),
        });

      // If we already have a view definition ready, set this on the event, and reset the buffer.
      currentViewEvent.definition = pendingViewDefinition;
      pendingViewDefinition = undefined;

      tracker.events.post(currentViewEvent);

      tracker.events.registerEventPatchSource(currentViewEvent!, () => ({
        duration: getViewTimeOffset(),
      }));

      dispatchViewChanged(currentViewEvent);
    };

    addPageVisibleListener((visible) => {
      if (visible) {
        visibleDuration(T);
        ++activations;
      } else {
        visibleDuration(F);
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

    return {
      processCommand: (command) =>
        isChangeUserCommand(command) &&
        (tracker(
          command.username
            ? { type: "login", username: command.username }
            : { type: "logout" }
        ),
        T),

      decorate: (event) => {
        currentViewEvent &&
          !isViewEvent(event) &&
          !isEventPatch(event) &&
          (event.view = currentViewEvent.clientId);
      },
    };
  },
};
