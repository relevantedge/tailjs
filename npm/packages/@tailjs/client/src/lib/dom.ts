import {
  cast,
  type Domain,
  type Position,
  type Rectangle,
  type ScreenPosition,
  type Size,
  type Viewport,
} from "@tailjs/types";
import type {
  ConstToNormal,
  MaybeUndefined,
  Nullish,
  Nulls,
  ValueOrDefault,
} from "@tailjs/util";
import {
  body,
  document,
  entries,
  err,
  F,
  filter,
  fun,
  lowerCase,
  map,
  match,
  MAX_SAFE_INTEGER,
  nil,
  parseBoolean,
  push,
  replace,
  round,
  T,
  undefined,
  window,
} from ".";

export type NodeWithParentElement = Node | EventTarget | Nullish;

export let MAX_ANCESTOR_DISTANCE = MAX_SAFE_INTEGER;

export const forAncestorsOrSelf = <T = any>(
  el: NodeWithParentElement,
  action: (
    el: Element,
    returnValue: (value: T, replace?: boolean) => void,
    distance: number
  ) => any,
  stoppingCriterion: (el: Element, distance: number) => boolean = (
    el,
    distance
  ) => distance >= MAX_ANCESTOR_DISTANCE
): T | undefined => {
  let i = 0,
    returnValue: any,
    stop = F;
  while (
    el?.["nodeType"] === 1 &&
    !stoppingCriterion(el as Element, i++) &&
    action(
      el as Element,
      (value, replace) => (
        value != nil &&
          ((returnValue = value), (stop = replace !== T && returnValue != nil)),
        T
      ),
      i - 1
    ) !== F &&
    !stop
  ) {
    const prev = el;
    el = (el as Element).parentElement;
    if (el === nil && (prev as Element)?.ownerDocument !== document) {
      el = (prev as Element)?.ownerDocument.defaultView?.frameElement;
    }
  }

  return returnValue;
};

export const inElementScope = (node: NodeWithParentElement, name: string) =>
  forAncestorsOrSelf(node, (el, value) =>
    value(tagName(el) === name || undefined)
  );

export const scopeAttr = (node: NodeWithParentElement, name: string) =>
  forAncestorsOrSelf(node, (el, value) => value(attr(el, name)));

export const attrl = (node: NodeWithParentElement, name: string) =>
  lowerCase(attr(node, name));

let value: string | null;
export const attrb = (node: NodeWithParentElement, name: string) =>
  (value = attr(node, name)) === "" || parseBoolean(value);

export const attrn = (node: NodeWithParentElement, name: string) =>
  parseFloat("" + (value = attr(node, name))) ?? undefined;

export const attrs = <T extends NodeWithParentElement | Nullish>(
  node: T
): string[] | Nulls<T, undefined> => (node as any)?.getAttributeNames();

export const attr = (
  node: NodeWithParentElement,
  name: string,
  value?: string | null
): string | null =>
  !(node as any)?.getAttribute
    ? nil
    : value === undefined
    ? (node as Element).getAttribute(name)
    : (value === nil
        ? (node as any).removeAttribute(name)
        : (node as any).setAttribute(name, value),
      value);

export const cssProperty = (el: Element, name: string) =>
  getComputedStyle(el).getPropertyValue(name) || nil;

let parameters: {};
export const define = <
  T,
  P extends Record<keyof any, [any, boolean?] | undefined>
>(
  target: T,
  props: P
): T & P =>
  ((parameters = {}),
  (map(
    filter(entries(props), ([_, value]) => value != nil),
    ([name, [value, writable = F] = []]) =>
      (parameters[name] = {
        writable,
        configurable: writable,
        value,
      })
  ),
  Object.defineProperties(target, parameters))) as any;

export const tagName = <T extends Element | Nullish>(
  el: T
): T extends Nullish ? null : string => (el != nil ? (el.tagName as any) : nil);

let pos: Position;
export const relativeScrollPos = (): Position => (
  (pos = scrollPos(F)),
  {
    x: pos.x / (body.offsetWidth - window.innerWidth) || 0,
    y: pos.y / (body.offsetHeight - window.innerHeight) || 0,
  }
);

export const scrollPos = (int?: boolean): Position => ({
  x: round(scrollX, int),
  y: round(scrollY, int),
});

export const matchExHash = (href1: string, href2: string) =>
  replace(href1, /#.*$/, "") === replace(href2, /#.*$/, "");

let screenPos: Position | undefined;
export const getScreenPos = <T extends Element | Nullish>(
  el: T,
  mouseEvent?: MouseEvent,
  includeFold = T
): ScreenPosition | Nulls<T> =>
  (screenPos = getPos(el, mouseEvent)) &&
  (cast<ScreenPosition>({
    xpx: screenPos.x,
    ypx: screenPos.y,
    x: round(screenPos.x / body.offsetWidth, 4),
    y: round(screenPos.y / body.offsetHeight, 4),
    pageFolds: includeFold ? screenPos.y / window.innerHeight : undefined,
  }) as any);

let x: number, y: number;
export const getPos = <T extends Element | Nullish>(
  el: T,
  mouseEvent?: MouseEvent
): ValueOrDefault<T, Position> =>
  !!mouseEvent?.["pointerType"] && mouseEvent?.pageY != nil
    ? { x: mouseEvent.pageX, y: mouseEvent.pageY }
    : el
    ? (({ x, y } = getRect(el)), { x, y })
    : (undefined as any);

let rect: DOMRect;
export const getRect = <T extends Element | Nullish>(
  el: T
): MaybeUndefined<T, Rectangle> =>
  el
    ? ((rect = el.getBoundingClientRect()),
      (pos = scrollPos(F)),
      {
        x: round(rect.left + pos.x),
        y: round(rect.top + pos.y),
        width: round(rect.width),
        height: round(rect.height),
      })
    : (undefined as any);

type AllMaps = WindowEventMap &
  GlobalEventHandlersEventMap &
  DocumentEventMap &
  HTMLElementEventMap;

export const listen = <K extends keyof AllMaps>(
  el: any,
  names: K[] | K,
  cb: (ev: AllMaps[K], unbind: () => void) => void,
  capture = T,
  passive = T
) => {
  let unbinders: any[] = [];

  return (
    map(names, (name, i) => {
      const mapped = (ev: any) => {
        cb(ev, unbinders[i]);
      };
      push(unbinders, () => el.removeEventListener(name, mapped, capture));
      return el.addEventListener(name, mapped, { capture, passive });
    }),
    () =>
      unbinders.length > 0 && map(unbinders, (unbind) => unbind())
        ? ((unbinders = []), T)
        : F
  );
};

export const listenOnce = <K extends keyof AllMaps>(
  el: any,
  names: K[] | K,
  cb: (event: AllMaps[K], unbind: () => void) => void,
  useCapture?: boolean
) =>
  listen(
    el,
    names,
    (event, unbind) => (cb(event, unbind), unbind()),
    useCapture
  );

export const parseDomain = <T extends string | Nullish>(
  href: T
): T extends string ? { domain?: Domain; href: string } : undefined =>
  href == nil
    ? (undefined as any)
    : match(
        href,
        /^(?:([a-zA-Z0-9]+):)?(?:\/\/)?([^\s\/]*)/,
        (all, protocol, domainName) =>
          domainName
            ? {
                href: href.substring(all.length),
                domain: {
                  protocol,
                  domainName,
                } as Domain,
              }
            : { href }
      );

export const getViewportSize = (): Size => ({
  width: window.innerWidth,
  height: window.innerHeight,
});

export const getViewport = (): Viewport => (
  (pos = scrollPos(T)),
  {
    ...pos,
    width: window.innerWidth,
    height: window.innerHeight,
    totalWidth: body.offsetWidth,
    totalHeight: body.offsetHeight,
  }
);

export const tryAsync = async <T, E = void>(
  action: (() => Promise<T> | T) | Promise<T> | T,
  error?: ((error: any) => Promise<E> | E) | Promise<E> | E,
  always?: () => void | Promise<void>
): Promise<T | E> => {
  try {
    return await (fun(action) ? action() : action);
  } catch (e) {
    console.error(e);
    return await (fun(error) ? error(e) : e);
  } finally {
    await always?.();
  }
};

export const tryCatch = <T, R = undefined>(
  action: () => T,
  error: ((e: any) => R) | any[] | false = (e) => err(nil, nil, e) as R,
  finallyCallback?: () => void
): ConstToNormal<T | R | undefined> => {
  const unbind = listen(window, "error", (ev) => ev.stopImmediatePropagation());
  try {
    return action() as any;
  } catch (e) {
    return error === F
      ? undefined
      : fun(error)
      ? error(e)
      : ((push(error, e) ?? err(nil, nil, e), undefined as R) as any);
  } finally {
    unbind();
    finallyCallback?.();
  }
};
