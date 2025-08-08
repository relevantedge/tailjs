import { SCOPE_INFO_KEY } from "@constants";

import {
  BoundaryDataView,
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
  isArray,
  map,
  nil,
  now,
  obj,
  parseUri,
  replace,
  skip,
  structuralEquals,
} from "@tailjs/util";
import {
  CurrentView,
  TrackerExtensionFactory,
  isChangeUserCommand,
  isViewCommand,
} from "..";
import { tracker } from "../initializeTracker";
import {
  TAB_ID,
  addPageVisibleListener,
  debug,
  getActiveTime,
  getViewport,
  isInternalUrl,
  listen,
  matchExHash,
  nextId,
  parseDomain,
  setLocalVariables,
  tryGetVariable,
  updateBoundaryData,
} from "../lib";

export let currentViewEvent: ViewEvent | undefined;
let unbindViewEventPatcher: (() => void) | undefined;

export const getCurrentViewId = () => currentViewEvent?.clientId;

let pushPopNavigation: ViewEvent["navigationType"] | undefined;
let pushPopNavigationType: ViewEvent["clientNavigation"] | undefined;

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
      poll: (current, _, previous) =>
        current
          ? true
          : previous?.[1] === navigationEventId && consumed() && false,
    });
};

const totalDuration = createTimer();
const visibleDuration = createTimer();

let activations = 1;

export const getVisibleDuration = () => visibleDuration();

const [addViewChangedListener, dispatchViewChanged] =
  createEvent<[viewEvent: ViewEvent]>();

export { addViewChangedListener };

export type ViewDurationTimer = (
  toggle?: boolean,
  reset?: boolean
) => ViewTimingData;
export const createViewDurationTimer = (
  started?: boolean
): ViewDurationTimer => {
  const totalTime = createTimer(started, totalDuration);
  const visibleTime = createTimer(started, visibleDuration);
  const activeTime = createTimer(started, getActiveTime);
  const activationsCounter = createTimer(started, () => activations);
  return (toggle, reset) => ({
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
  triggerCurrent && forEach(frames, (frame) => listener(frame, () => false));
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
          frames,
          (frame: any) => add(knownFrames, frame) && callOnFrame(frame)
        ),
      500
    ).trigger();

    // View definitions may be loaded asynchronously both before and after navigation happens.
    // This means the `definition` property of the current view event is updated independently of its creation.
    // If the event has already been sent, and additional patch event is sent with the definition.
    // When a definition has been associated with the current view event, it will not be changed.
    // Instead any new view definition that arrives before the next navigation is assumed to be for the next view event.

    let pendingViewDefinition: View | undefined;

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

      unbindViewEventPatcher?.();

      const {
        source: href,
        scheme,
        host,
        query,
      } = parseUri(location.href + "", { requireAuthority: true }) ?? {};
      currentViewEvent = {
        type: "view",
        timestamp: now(),
        clientId: nextId(),
        tab: TAB_ID,
        href,
        path: location.pathname,
        hash: location.hash || undefined,
        domain: { scheme, host },
        queryString: obj(query, ([key, value]) =>
          isArray(value) ? [key, value] : [key, [value]]
        ),
        tabNumber: tabIndex + 1,
        tabViewNumber: viewIndex + 1,
        viewport: getViewport(),
        duration: timer(undefined, true),
      };

      tabIndex === 0 && (currentViewEvent.firstTab = T);
      tabIndex === 0 && viewIndex === 0 && (currentViewEvent.landingPage = T);

      setLocalVariables({ scope: "tab", key: "viewIndex", value: ++viewIndex });

      map(
        ["source", "medium", "campaign", "term", "content"],
        (p, _) =>
          ((currentViewEvent!.utm ??= {})[p] = array(
            currentViewEvent?.queryString?.[`utm_${p}`]
          )?.[0]) ?? skip
      );

      !(currentViewEvent.navigationType = pushPopNavigation) &&
        performance &&
        forEach(
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
      if (pushPopNavigationType) {
        currentViewEvent.clientNavigation = pushPopNavigationType;
      }

      pushPopNavigation = pushPopNavigationType = undefined;

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

      unbindViewEventPatcher = tracker.events.registerEventPatchSource(
        currentViewEvent!,
        () => ({
          duration: getViewTimeOffset(),
          tags: currentViewEvent!.tags,
        })
      );

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
    forEach(["push", "replace"] as const, (name) => {
      const methodName = name + "State";
      const inner = history[methodName];
      history[methodName] = (...args: any) => {
        inner.apply(history, args);
        pushPopNavigation = "navigate";
        pushPopNavigationType = name;
        postView();
      };
    });

    postView();

    return {
      processCommand: (command) => {
        if (isChangeUserCommand(command)) {
          tracker(
            command.username
              ? { type: "login", username: command.username }
              : { type: "logout" }
          );
          return true;
        } else if (isViewCommand(command)) {
          const view = command.view;
          const viewTags = (view as BoundaryDataView)?.tags;
          if (viewTags) {
            if (currentViewEvent) {
              const newTags =
                (
                  updateBoundaryData(
                    currentViewEvent,
                    {
                      view: {
                        tags: viewTags,
                      },
                    },
                    (view as BoundaryDataView).layer
                  ) as any
                )?.view.tags ?? [];

              if (!structuralEquals(currentViewEvent.tags, newTags)) {
                currentViewEvent.tags = newTags;
              }
            }
          }
          const definition = (view as CurrentView)?.id
            ? (view as CurrentView)
            : (view as BoundaryDataView)?.definition || undefined;
          if (
            definition &&
            !structuralEquals(definition, currentViewEvent?.definition)
          ) {
            if (currentViewEvent == null || currentViewEvent.definition) {
              pendingViewDefinition = definition;
              if ((definition as CurrentView).navigation) {
                postView(true);
              }
            } else {
              currentViewEvent.definition = definition;
              let patchMessage = "";
              if (currentViewEvent.metadata?.posted) {
                patchMessage = " via patch";
                // Send the definition as a patch because the view event has already been posted.
                tracker.events.postPatch(currentViewEvent, {
                  definition: currentViewEvent.definition,
                });
              }
              debug(
                currentViewEvent,
                `${currentViewEvent.type} (definition updated${patchMessage})`
              );
            }
            tracker({
              set: { scope: "view", key: "view", value: definition ?? null },
            });
          }

          return true;
        }

        return false;
      },

      decorate: (event) => {
        currentViewEvent &&
          !isViewEvent(event) &&
          !isEventPatch(event) &&
          (event.view = currentViewEvent.clientId);
      },
    };
  },
};
