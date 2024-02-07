import {
  Binders,
  Listener,
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
  HTMLElementEventMap;

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

type PageLoadListenerArgs = [loaded: boolean];
const [addPageLoadedListener, dispatchPageLoaded] =
  createEvent<PageLoadListenerArgs>();

let loaded = true;
listen(
  window,
  "pagehide",
  () => loaded && dispatchPageLoaded((loaded = false))
);
listen(
  window,
  "pageshow",
  () => !loaded && dispatchPageLoaded((loaded = true))
);
listen(
  document,
  "visibilitychange",
  () =>
    document.visibilityState === "visible" &&
    !loaded &&
    dispatchPageLoaded((loaded = true))
);

dispatchPageLoaded(loaded);

type PageActivatedListenerArgs = [activated: boolean, totalDuration: number];
let activated = false;
let activeTime = createTimer(false);

const [addPageActivatedListener, dispatchPageActivated] =
  createEvent<PageActivatedListenerArgs>();

const activationTimeout = clock(
  () =>
    activated && dispatchPageActivated((activated = false), activeTime(false)),
  {
    frequency: 20000,
    once: true,
    paused: true,
  }
);
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
export { addPageLoadedListener, addPageActivatedListener };
