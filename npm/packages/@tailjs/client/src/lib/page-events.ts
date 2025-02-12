import { clock, createEvent, createTimer } from "@tailjs/util";
import { listen } from ".";

type PageLoadListenerArgs = [loaded: boolean, stateDuration: number];
const [addPageLoadedListener, dispatchPageLoaded] =
  createEvent<PageLoadListenerArgs>();

const [addPageVisibleListener, dispatchPageVisible] =
  createEvent<[visible: boolean, unloading: boolean, delta: number]>();

const maybeDispatchPageLoaded = (newLoaded: boolean) =>
  loaded !== (loaded = newLoaded) &&
  dispatchPageLoaded(loaded, sleepTimer(true, true));

const maybeDispatchPageVisible = (loaded: boolean) =>
  visible !==
    (visible = loaded ? document.visibilityState === "visible" : false) &&
  dispatchPageVisible(visible, !loaded, visibleTimer(true, true));

// A visibilitychange event may not be triggered if the page BF cache loads/unloads.
addPageLoadedListener(maybeDispatchPageVisible);

let loaded = true;
let visible = false;
let visibleTimer = createTimer(false);
let sleepTimer = createTimer(false);

listen(window, ["pagehide", "freeze", "beforeunload"], () =>
  maybeDispatchPageLoaded(false)
);
listen(window, ["pageshow", "resume"], () => maybeDispatchPageLoaded(true));
listen(
  document,
  "visibilitychange",
  () => (
    maybeDispatchPageVisible(true), visible && maybeDispatchPageLoaded(true)
  )
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

listen(window, ["focus", "scroll"], setActivated);
listen(window, "blur", () => activationTimeout.trigger());

listen(
  document.body,
  ["keydown", "pointerdown", "pointermove", "scroll"],
  setActivated
);

setActivated();

export const getActiveTime = () => activeTime();
export {
  addPageActivatedListener,
  addPageLoadedListener,
  addPageVisibleListener,
};
