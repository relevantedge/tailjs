import { isArray, map } from "@tailjs/util";
import {
  Binders,
  Listener,
  Unbinder,
  createBinders,
  createEvent,
  mergeBinders,
} from ".";

type PageListenerArgs = [visible: boolean, loaded: boolean];
const [addListener, dispatch] = createEvent<PageListenerArgs>();

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
    ? mergeBinders(
        ...map(name, (name) => listen(target, name as any, listener, options))
      )
    : createBinders(
        listener,
        (listener) => target.addEventListener(name, listener, options),
        (listener) => target.addEventListener(name, listener, options)
      );
};

let binders: ReturnType<typeof addListener>;
export const addPageListener = (
  listener: Listener<PageListenerArgs>,
  triggerLoaded = true
) => (
  (binders = addListener(listener)),
  loaded && triggerLoaded && listener(visible, false, binders[0]),
  binders
);

let visible = true;
let loaded = false;

const dispatchVisible = () =>
  (!loaded || !visible) &&
  dispatch((visible = true), loaded || !(loaded = true));

listen(
  window,
  "pagehide",
  () => (visible || loaded) && dispatch((visible = false), (loaded = false))
);
listen(window, "pageshow", dispatchVisible);
listen(document, "visibilitychange", () =>
  document.visibilityState === "visible"
    ? dispatchVisible()
    : visible && dispatch((visible = false), loaded)
);
