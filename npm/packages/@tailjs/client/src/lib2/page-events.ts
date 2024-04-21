import {
  Binders,
  Unbinder,
  clock,
  createEvent,
  createEventBinders,
  createTimer,
  isArray,
  joinEventBinders,
  map,
} from "@tailjs/util";

type AllMaps = WindowEventMap &
  GlobalEventHandlersEventMap &
  DocumentEventMap &
  HTMLElementEventMap & {
    freeze: PageTransitionEvent;
    resume: PageTransitionEvent;
  };

export const listen = <K extends keyof AllMaps>(
  target: {
    addEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ): void;
    removeEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | EventListenerOptions
    ): void;
  },
  name: K | K[],
  listener: (
    ev: AllMaps[K extends any[] ? K[number] : K],
    unbind?: Unbinder
  ) => any,
  options: AddEventListenerOptions = { capture: true, passive: true }
): Binders => {
  return isArray(name)
    ? joinEventBinders(
        ...map(name, (name) => listen(target, name as any, listener, options))
      )
    : createEventBinders(
        listener,
        (listener) => target.addEventListener(name, listener, options),
        (listener) => target.addEventListener(name, listener, options)
      );
};

type PageLoadListenerArgs = [loaded: boolean, stateDuration: number];
const [addPageLoadedListener, dispatchPageLoaded] =
  createEvent<PageLoadListenerArgs>();

let loaded = true;
let sleepTimer = createTimer(false);
listen(
  window,
  ["pagehide", "freeze"],
  () => loaded && dispatchPageLoaded((loaded = false), sleepTimer(true, true))
);
listen(
  window,
  ["pageshow", "resume"],
  () => !loaded && dispatchPageLoaded((loaded = true), sleepTimer(true, true))
);
listen(
  document,
  "visibilitychange",
  () =>
    document.visibilityState === "visible" &&
    !loaded &&
    dispatchPageLoaded((loaded = true), sleepTimer(true, true))
);

dispatchPageLoaded(loaded, sleepTimer(true, true));

type PageActivatedListenerArgs = [activated: boolean, totalDuration: number];
let activated = false;
let activeTime = createTimer(false);

const [addPageActivatedListener, dispatchPageActivated] =
  createEvent<PageActivatedListenerArgs>();

const activationTimeout = clock({
  callback: () =>
    activated && dispatchPageActivated((activated = false), activeTime(false)),
  frequency: 20000,
  once: true,
  paused: true,
});
const setActivated = () =>
  !activated &&
  (dispatchPageActivated((activated = true), activeTime(true)),
  activationTimeout.restart());

listen(window, "focus", setActivated);
listen(window, "blur", () => activationTimeout.trigger());

listen(document.body, "keydown", setActivated);
listen(document.body, "pointermove", setActivated);
listen(window, "scroll", setActivated);

setActivated();

export const getActiveTime = () => activeTime();
export { addPageActivatedListener, addPageLoadedListener };
