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
  NOOP,
  Nullable,
  T,
  Unbinder,
  array,
  concat,
  createEventBinders,
  createTimeout,
  forEach,
  isArray,
  nil,
  parseBoolean,
  parseUri,
  replace,
  restrict,
  round,
  tryCatch,
  type MaybeUndefined,
  type Nullish,
} from "@tailjs/util";
import { body, document, httpDecode, httpDecrypt } from "..";

export type NodeWithParentElement = Node | EventTarget;

export let MAX_ANCESTOR_DISTANCE = MAX_SAFE_INTEGER;

export const forAncestorsOrSelf = <T = any>(
  el: NodeWithParentElement | Nullish,
  action: (
    el: Element,
    returnValue: (value: T | undefined, replace?: boolean) => void,
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

export type AttributeValueType =
  /**
   * The normalized attribute value, int the sense it gets trimmed and lowercased.
   * The empty spring is considered undefined.
   *
   * This is the default.
   */
  | true
  | "z"

  /**
   * The attribute value as a boolean or undefined if it does match `0`, `1`, `true`, `false` or "".
   * The empty string matches existence of an attribute `<tag attribute/>`.
   * If parsing arrays of booleans, the empty string will be considered undefined since that is an empty element in this context.
   */
  | "b"

  /** The attribute value as a number or undefined if it does not look like a number. */
  | "n"

  /** The raw attribute value. */
  | false
  | "r"

  /**  The attribute value parsed as JSON. */
  | "j"

  /**  The attribute value parsed as a HTTP encoded string (from @tailjs/util/transport). */
  | "h"

  /**  The attribute value parsed as a client encrypted value (from @tailjs/util/transport). This also supports JSON. */
  | "e"

  /**
   * This means the attribute value will be parsed as an array with elements separated by `,`.
   * Whitespace is trimmed, and empty values are considered undefined.
   *
   * A type may be included in the tuple to parse the items as this type. In this case unparsable values will be included in the array
   * as undefined.
   */
  | readonly [type?: AttributeValueType & string];

type ParsedAttributeValue<
  T extends AttributeValueType | Nullish,
  EncodedType = any
> = T extends readonly [infer T extends AttributeValueType]
  ? ParsedAttributeValue<T>[]
  : T extends (boolean | "z" | Nullish) | "r"
  ? string
  : T extends "b"
  ? boolean | undefined
  : T extends "n"
  ? number | undefined
  : T extends "j" | "h" | "e"
  ? EncodedType | undefined
  : never;

export const parseAttributeValue: <
  V,
  Type extends AttributeValueType | Nullish = "z"
>(
  value: V,
  type: Type
) => MaybeUndefined<
  V,
  Type extends "b"
    ? boolean
    : V extends ""
    ? undefined
    : ParsedAttributeValue<Type>
> = (value: any, type = "z" as any) => {
  if (value == null || value === "null" || (value === "" && type !== "b"))
    return undefined;

  switch (type) {
    case true:
    case "z":
      return ("" + value).trim()?.toLowerCase();
    case false:
    case "r":
      value;
    case "b":
      return value === "" || parseBoolean(value);
    case "n":
      return parseFloat(value);
    case "j":
      return tryCatch(() => JSON.parse(value), NOOP);
    case "h":
      return tryCatch(() => httpDecode(value), NOOP);
    case "e":
      return tryCatch(() => httpDecrypt?.(value), NOOP);
    default:
      return isArray(type)
        ? value === ""
          ? undefined
          : ("" + value)
              .split(",")
              .map(
                (value) =>
                  (value =
                    value.trim() === ""
                      ? undefined
                      : parseAttributeValue(value, type![0]))
              )
        : undefined;
  }
};

export const attr = <
  Node extends NodeWithParentElement | Nullish,
  Type extends AttributeValueType | Nullish = "z"
>(
  node: Node,
  name: string,
  type?: Type
) => parseAttributeValue((node as any)?.getAttribute(name), type);

export const setAttribute = (
  node: NodeWithParentElement | Nullish,
  name: string,
  value: any
) =>
  value === nil
    ? (node as any)?.removeAttribute(name)
    : (node as any)?.setAttribute(name, "" + value);

export const scopeAttribute = (
  node: NodeWithParentElement | Nullish,
  name: string,
  type?: AttributeValueType
) => forAncestorsOrSelf(node, (el, value) => value(attr(el, name, type)));

export const inElementScope = (
  node: NodeWithParentElement | Nullish,
  name: string
) =>
  forAncestorsOrSelf(node, (el, value) =>
    value(tagName(el) === name || undefined)
  );

export const normalizedAttribute = (
  node: NodeWithParentElement | Nullish,
  name: string
) => attr(node, name)?.trim()?.toLowerCase();

let value: string | undefined;

export const booleanAttribute = (
  node: NodeWithParentElement | Nullish,
  name: string
) => (value = attr(node, name)) === "" || parseBoolean(value);

export const numericAttribute = (
  node: NodeWithParentElement | Nullish,
  name: string
) => parseFloat("" + (value = attr(node, name))) ?? undefined;

export const attributeNames = <
  T extends NodeWithParentElement | Nullish | Nullish
>(
  node: T
): MaybeUndefined<T, string[]> => (node as any)?.getAttributeNames();

export const cssProperty = (el: Element, name: string) =>
  getComputedStyle(el).getPropertyValue(name) || nil;

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
): MaybeUndefined<ScreenPosition> =>
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
    unbind: Unbinder
  ) => any,
  options: AddEventListenerOptions = { capture: true, passive: true }
): Binders => {
  name = array(name) as any;
  return createEventBinders(
    listener,
    (listener) =>
      forEach(name, (name) => target.addEventListener(name, listener, options)),
    (listener) =>
      forEach(name, (name) =>
        target.removeEventListener(name, listener, options)
      )
  );
};

export const parseDomain = (href: string): Domain => {
  const { host, scheme, port } = parseUri(href, false, true);
  return { host: host + (port ? ":" + port : ""), scheme };
};

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

export type Overlay = {
  move(rect: DOMRect | Element): Overlay;
  text(text: string): Overlay;
  toggle(show: boolean): Overlay;
};
export const overlay = (
  rect?: DOMRect | Element,
  text?: string,
  pulse?: boolean
): Overlay => {
  let backdropEl: HTMLElement | undefined;
  let textEl: HTMLElement | undefined;

  let currentText = text;
  let currentRect: DOMRect | undefined = rect as any;
  const ensureElements = () => {
    if (backdropEl) return true;

    backdropEl = document.createElement("div");
    backdropEl.style.cssText =
      "position:absolute;border:4px solid blue;pointer-events:none;z-index:100";
    body.appendChild(backdropEl);

    textEl = document.createElement("div");
    textEl.style.cssText =
      "position:absolute; font-family: sans-serif; font-size: 14px; right: 0; top: 0;margin:10px";
    backdropEl.appendChild(textEl);

    overlay.move(currentRect).text(currentText);
    return false;
  };

  const cleaner = createTimeout();

  const overlay = {
    move(rect: DOMRect | Element | Nullish) {
      currentRect = rect = (rect as Element).getBoundingClientRect?.() ??
        rect ?? {
          top: 0,
          left: 0,
          width: 0,
          height: 0,
        };

      if (!ensureElements()) {
        return overlay;
      }

      if (!currentRect!.width) {
        return overlay.toggle(false);
      }

      let offset = body.getBoundingClientRect();
      ["top", "left", "width", "height"].forEach((p, i) => {
        backdropEl!.style[p] = rect![p] - (i < 2 ? offset[p] : 0) + "px";
      });
      offset = backdropEl!.getBoundingClientRect();
      textEl!.style.top = (offset.top < 0 ? -offset.top : 0) + "px";

      textEl!.style.right =
        (offset.right > window.innerWidth
          ? offset.right - window.innerWidth
          : 0) + "px";

      return overlay;
    },
    text: (text: string | Nullish) => (
      ensureElements() && (textEl!.innerText = currentText = text ?? ""),
      overlay
    ),

    toggle(show: boolean) {
      if (!backdropEl) {
        if (!show) return overlay;
        ensureElements();
      }
      backdropEl!.style.transition = show ? "" : "opacity 1s .5s";
      backdropEl!.style.opacity = show ? "1" : "0";

      show
        ? cleaner(false)
        : cleaner(() => {
            if (!backdropEl) return;
            body.removeChild(backdropEl);
            backdropEl = textEl = undefined;
          }, 1100);
      return overlay;
    },
  };

  currentRect && overlay.move(currentRect).text(currentText);
  pulse && overlay.toggle(true).toggle(false);

  return overlay;
};
