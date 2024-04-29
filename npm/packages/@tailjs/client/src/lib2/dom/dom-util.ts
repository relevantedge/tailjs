import {
  type Domain,
  type Position,
  type Rectangle,
  type ScreenPosition,
  type Size,
  type Viewport,
} from "@tailjs/types";
import {
  Binders,
  F,
  MAX_SAFE_INTEGER,
  Nullable,
  T,
  Unbinder,
  createEventBinders,
  entries,
  filter,
  isArray,
  joinEventBinders,
  map,
  match,
  nil,
  parseBoolean,
  replace,
  restrict,
  type MaybeUndefined,
  type Nullish,
  type Nulls,
} from "@tailjs/util";
import { body, round } from "..";

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
  let i = 0;
  let returnValue: any;
  let stop = F;
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
    if (el === null && (prev as Element)?.ownerDocument !== document) {
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
  attr(node, name)?.toLowerCase();

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
  (restrict<ScreenPosition>({
    xpx: screenPos.x,
    ypx: screenPos.y,
    x: round(screenPos.x / body.offsetWidth, 4),
    y: round(screenPos.y / body.offsetHeight, 4),
    pageFolds: includeFold ? screenPos.y / window.innerHeight : undefined,
  }) as any);

let x: number;
let y: number;
export const getPos = <Nulls>(
  el: Nullable<Element, Nulls>,
  mouseEvent?: MouseEvent
): MaybeUndefined<Nulls, Position> => {
  return !!mouseEvent?.["pointerType"] && mouseEvent?.pageY != nil
    ? { x: mouseEvent.pageX, y: mouseEvent.pageY }
    : el
    ? (({ x, y } = getRect(el)!), { x, y })
    : (undefined as any);
};

let rect: DOMRect;
export const getRect = <Nulls>(
  el: Nullable<Element, Nulls>
): MaybeUndefined<Nulls, Rectangle> =>
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

export const parseDomain = <T extends string | Nullish>(
  href: T
): T extends string ? { domain?: Domain; href: string } : undefined =>
  href == null
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
