import { LocalID, View, ViewEvent, isViewEvent } from "@tailjs/types";
import {
  F,
  T,
  add,
  clock,
  createEvent,
  createTimer,
  forEach,
  map,
  merge,
  nil,
  now,
  parseQueryString,
  parseUri,
  push,
  replace,
  structuralEquals,
} from "@tailjs/util";
import { TrackerExtensionFactory, isChangeUserCommand } from "..";
import { tracker } from "../initializeTracker";
import {
  LocalVariableScope,
  TAB_ID,
  addPageActivatedListener,
  addPageVisibleListener,
  deltaDiff,
  getViewport,
  getViewportSize,
  isInternalUrl,
  listen,
  matchExHash,
  nextId,
  parseDomain,
  setLocalVariables,
  tryGetVariable,
} from "../lib2";

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
      result: (current: any, previous: any, poll) => {
        current
          ? poll()
          : previous?.value?.[1] === navigationEventId && consumed();
      },
    });
};

const totalDuration = createTimer();
const visibleDuration = createTimer();
const interactiveDuration = createTimer();
let activations = 1;

export const getVisibleDuration = () => visibleDuration();

const [addViewChangedListener, dispatchViewChanged] =
  createEvent<[viewEvent: ViewEvent]>();

export { addViewChangedListener };

export const createViewDurationTimer = (started?: boolean) => {
  const totalTime = createTimer(started, totalDuration);
  const visibleTime = createTimer(started, visibleDuration);
  const interactiveTime = createTimer(started, interactiveDuration);
  const activationsCounter = createTimer(started, () => activations);
  return (toggle?: boolean, reset?: boolean) => ({
    totalTime: totalTime(toggle, reset),
    visibleTime: visibleTime(toggle, reset),
    interactiveTime: interactiveTime(toggle, reset),
    activations: activationsCounter(toggle, reset),
  });
};

const timer = createViewDurationTimer();
export const getViewTimeOffset = () => timer();

const [onFrame, callOnFrame] = createEvent<[frame: HTMLIFrameElement]>();
export { onFrame };

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
      -1000
    ).trigger();

    tracker.push({
      get: [
        {
          scope: "view",
          key: "view",
          result: (value) => {
            value;
          },
        },
      ],
    });
    // Keep track of when new views are set.
    // A view is considered new if either 1) it is different (duh) or 2) set from a different href.
    // This is to prevent stray updates from, say, React components that may set the variable every time they rerender.

    // TODO: Move to separate function.

    /** This contains the next view for view events. It is cleared when the view event is posted.  */
    let nextView: View | undefined;
    let previousHref: string;
    let currentView: View | undefined;
    tracker.variables.get({
      scope: "view",
      key: "view",
      result: (value, _, poll) => {
        // Only update the view
        (!structuralEquals(currentView, value?.value) ||
          previousHref !== (previousHref = "" + location.href)) &&
          (nextView = currentView = value?.value);

        if (nextView && currentViewEvent && !currentViewEvent.definition) {
          currentViewEvent.definition = nextView;
          if (currentViewEvent.metadata?.posted) {
            // Send the definition as a patch because the view event has already been posted.
            tracker.events.postPatch(currentViewEvent, {
              definition: nextView,
            });
          }
          nextView = undefined;
        }

        return poll();
      },
    });

    let localIndex = tryGetVariable({ scope: "tab", key: "index" })?.value ?? 0;
    let globalIndex = tryGetVariable({ scope: "tab", key: "index" })?.value;
    if (globalIndex == null) {
      globalIndex =
        tryGetVariable({ scope: "shared", key: "index" })?.value ?? 0;
      setLocalVariables({
        scope: LocalVariableScope.Shared,
        key: "index",
        value: globalIndex + 1,
      });
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
        tabIndex: globalIndex,
        viewport: getViewport(),
        duration: timer(undefined, true),
      };

      globalIndex === 0 && (currentViewEvent.firstTab = T);
      globalIndex === 0 &&
        localIndex === 0 &&
        (currentViewEvent.landingPage = T);

      const qs = parseQueryString(location.href);
      map(
        ["source", "medium", "campaign", "term", "content"],
        (p, _) => ((currentViewEvent!.utm ??= {})[p] = qs[`utm_${p}`]?.[0])
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

      // If we already have a view ready, set this on the event.
      currentViewEvent.definition = nextView;
      nextView = undefined;
      tracker.events.post(currentViewEvent);

      //dispatchViewChanged(currentViewEvent!);

      tracker.events.registerEventPatchSource(currentViewEvent!, (previous) =>
        deltaDiff(
          {
            duration: getViewTimeOffset(),
          },
          previous
        )
      );

      dispatchViewChanged(currentViewEvent);
    };

    addPageActivatedListener((activated) => interactiveDuration(activated));
    addPageVisibleListener((visible) => {
      if (visible) {
        visibleDuration(T);
        ++activations;
      } else {
        visibleDuration(F);
        interactiveDuration(F);
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
        (push(
          tracker,
          command.username
            ? { type: "login", username: command.username }
            : { type: "logout" }
        ),
        T),

      decorate: (event) => {
        currentViewEvent &&
          !isViewEvent(event) &&
          (event.view = currentViewEvent.clientId);
      },
    };
  },
};
