import { CLIENT_CALLBACK_CHANNEL_ID } from "@constants";

import {
  AnchorNavigationEvent,
  CartUpdatedEvent,
  ComponentClickEvent,
  ComponentClickIntentEvent,
  ComponentElementInfo,
  ElementInfo,
  NavigationEvent,
  ScreenPosition,
  UserInteractionEvent,
  uniqueReferences,
} from "@tailjs/types";
import {
  F,
  ParsedUri,
  T,
  ellipsis,
  forEach,
  isObject,
  map,
  nil,
  parseUri,
  remove,
  some,
  stop,
  update,
  type Nullish,
} from "@tailjs/util";
import {
  TrackerExtensionFactory,
  checkTrackingEnabled,
  getComponentContext,
  getViewTimeOffset,
  onFrame,
  pushNavigationSource,
  tryGetCartEventData,
} from "..";
import {
  MNT_URL,
  attr,
  forAncestorsOrSelf,
  getBoundaryData,
  getPos,
  getRect,
  getScreenPos,
  getViewport,
  isInternalUrl,
  listen,
  matchExHash,
  nextId,
  tagName,
  trackerConfig,
  trackerFlag,
} from "../lib";

const isLinkElement = (
  el: Element,
  href: any = tagName(el) === "A" && attr(el, "href")
): el is HTMLAnchorElement =>
  href && href != "#" && !href.startsWith("javascript:");

const isFormElement = (el: Element, t = tagName(el)): el is HTMLElement =>
  t === "INPUT" || t === "SELECT" || t == "TEXTAREA" || t === "LABEL";

const isClickable = (
  el: Element,
  t = tagName(el),
  isButton = trackerFlag(el, "button"),
  type = attr(el, "type")
): el is HTMLElement =>
  isButton === T ||
  (isButton !== F &&
    (t === "A" ||
      t === "BUTTON" ||
      (t === "INPUT" &&
        ((type = type?.toLowerCase()) === "button" ||
          type === "submit" ||
          (type === "checkbox" && !(el as HTMLInputElement).form)))));

export const getElementInfo = (el: Element, includeRect = false) =>
  ({
    tagName:
      el.tagName === "INPUT" && el["type"]
        ? `${el.tagName}[type=${el["type"]}]`
        : el.tagName,
    text: ellipsis(
      attr(el, "title")?.trim() ||
        attr(el, "alt")?.trim() ||
        (el as HTMLElement).innerText?.trim(),
      50
    ),
    className: el.className || undefined,
    href: (el as any).href?.toString(),
    rect: includeRect ? getRect(el) : undefined,
  } satisfies ElementInfo);
const getElementLabel = (
  el: Element | EventTarget | null,
  container: Element,
  includeRect = false
) => {
  let info: Pick<UserInteractionEvent, "element"> | undefined;
  forAncestorsOrSelf(el ?? container, (el) =>
    tagName(el) === "IMG" || el === container
      ? ((info = {
          element: getElementInfo(el, includeRect),
        }),
        F)
      : T
  );
  return info;
};
export const userInteraction: TrackerExtensionFactory = {
  id: "navigation",

  setup(tracker) {
    // The tracked click positions for click events that has already been posted once.
    const activeEventClicks = new WeakMap<Node, ScreenPosition[]>();

    const stripPositions = <T = any>(el: any, hitTest: boolean): T =>
      hitTest
        ? el
        : (map(el, ([key]) =>
            key === "rect" ||
            //key === "pos"  Changed so pos is always included.
            key === "viewport"
              ? remove(el, key)
              : isObject(el[key]) &&
                map(el[key], (item) => stripPositions(item, hitTest))
          ),
          el);
    const trackDocument = (document: Document) => {
      listen(
        document,
        ["click", "contextmenu", "auxclick", "pointerdown"],
        (ev: MouseEvent) => {
          if (!checkTrackingEnabled(ev.target)) {
            return;
          }

          // The pointerdown event is only used to detect "app" links, e.g. "mailto:" or "tel:".
          // The reason is, that they may open native browser pop-ups such as which app to use,
          // in which case the normal click event is not fired (like context menu).
          const isPointerEvent = ev.type === "pointerdown";

          let trackClicks: boolean | Nullish;
          let trackRegion: boolean | Nullish;
          let clickableElement: HTMLElement | undefined;
          let containerElement: Element | undefined;
          // Used to decide whether there can be a click intent. If the user clicks a form element, click intent is not the case.
          let formElement: HTMLElement | null = null;

          let nav = F;

          let clickables: ComponentElementInfo[] | undefined;

          forAncestorsOrSelf<boolean>(ev.target, (el) => {
            isClickable(el) && (clickableElement ??= el);
            isFormElement(el) && (formElement ??= el);
            nav = nav || tagName(el) === "NAV";

            const boundary = getBoundaryData(el);
            const components = uniqueReferences(boundary?.components);
            if (!ev.button && components?.length && !clickables) {
              forEach(
                el.querySelectorAll("a,button"),
                (clickable) =>
                  isClickable(clickable) &&
                  ((clickables ??= []).length > 3
                    ? ((clickables = undefined), stop) // If there are more than three clickables, there is presumably not any missed click intent.
                    : clickables.push({
                        ...getElementInfo(clickable, true),
                        component: forAncestorsOrSelf(
                          clickable,
                          (
                            child,
                            r,
                            _,
                            childComponents = uniqueReferences(
                              getBoundaryData(child)?.components
                            )
                          ) => childComponents && r(childComponents[0]),
                          (child) => child === el
                        ),
                      }))
              );

              if (clickables) {
                containerElement ??= el;
              }
            }

            trackClicks ??=
              trackerFlag(el, "clicks", T, (data) => data.track?.clicks) ??
              (components &&
                some(components, (cmp) => cmp.track?.clicks !== F));

            trackRegion ??=
              trackerFlag(el, "region", T, (data) => data.track?.region) ??
              (components && some(components, (cmp) => cmp.track?.region));
          });

          if (!(containerElement ??= clickableElement)) {
            return;
          }
          const clickIntent =
            clickables?.length! > 0 &&
            !clickableElement &&
            !formElement &&
            trackClicks;

          const componentContext = (eventType: string) =>
            getComponentContext(clickableElement ?? containerElement!, {
              includeRegion: clickIntent,
              eventType,
            });

          trackClicks ??= !nav;
          trackRegion ??= T;

          const sharedEventProperties = {
            ...(trackRegion
              ? {
                  pos: getScreenPos(clickableElement, ev),
                  viewport: getViewport(),
                }
              : nil),
            ...getElementLabel(ev.target, clickableElement ?? containerElement),
            timeOffset: getViewTimeOffset(),
          };
          if (!clickableElement) {
            !isPointerEvent &&
              clickIntent &&
              update(activeEventClicks, containerElement, (current) => {
                const pos = getPos(containerElement!, ev);
                if (!current) {
                  // Reuse the same event and only add the new click coordinates
                  // if the element is clicked again to reduce data.
                  const intentEvent = {
                    type: "component_click_intent",
                    ...sharedEventProperties,
                    ...componentContext("component_click_intent"),
                    clicks: (current = [pos]),
                    elements: clickables,
                  } satisfies ComponentClickIntentEvent;

                  tracker.events.registerEventPatchSource(
                    intentEvent,
                    () => ({
                      clicks: activeEventClicks.get(containerElement!),
                    }),
                    true,
                    containerElement
                  );
                } else {
                  current.push(pos);
                }

                return current;
              });

            return;
          }

          if (isLinkElement(clickableElement!)) {
            const link = clickableElement;
            const external = link.hostname !== location.hostname;
            const elementHRef = link.href || link.getAttribute("href") || "";
            if (!elementHRef) {
              return;
            }

            if (
              link.host === location.host &&
              link.pathname === location.pathname &&
              link.search === location.search
            ) {
              if (link.hash === "#") {
                // Don't care about that one.
                return;
              }
              if (link.hash !== location.hash) {
                if (ev.button === 0 && !isPointerEvent)
                  tracker({
                    type: "anchor_navigation",
                    anchor: link.hash,
                    ...sharedEventProperties,
                    ...componentContext("anchor_navigation"),
                  } satisfies AnchorNavigationEvent);
              }
              return;
            }

            let parsed: Pick<ParsedUri, "host" | "source" | "scheme"> =
              parseUri(elementHRef, {
                delimiters: false,
                requireAuthority: true,
              });
            if (!parsed) {
              const schemeMatch = elementHRef.match(/^([^:]+):(?:\/\/)?(.+)/);
              parsed = {
                source: elementHRef,
                scheme: schemeMatch?.[1],
              };
            }

            let { host, scheme, source: href } = parsed;

            if (!href) {
              return;
            }
            scheme = scheme?.toLowerCase();
            const isHttpNavigation = !!scheme?.match(/^https?/);

            if (
              (isHttpNavigation && isPointerEvent) ||
              (!isHttpNavigation && !isPointerEvent)
            ) {
              // Only trap "mailto:", "tel:" etc. via pointer down.
              return;
            }
            const navigationEvent: NavigationEvent = {
              clientId: nextId(),
              type: "navigation",
              href: external ? link.href : href,
              external,
              domain: host || scheme ? { host, scheme } : undefined,
              self: T,
              anchor: link.hash || undefined,
              ...sharedEventProperties,
              ...componentContext("navigation"),
            } satisfies NavigationEvent;

            // There does not seem to be any way to detect when the user clicks
            // "Open link in new tab/window", so we need to do a little extra gymnastics to capture it.
            if (ev.type === "contextmenu") {
              if (isHttpNavigation) {
                const originalUrl = link.href;
                const internalUrl = isInternalUrl(originalUrl);
                if (internalUrl) {
                  // If the page loads in a new tab, it will pick up this value as the referrer,
                  //   and we will know navigation happened.
                  pushNavigationSource(navigationEvent.clientId, () =>
                    tracker(navigationEvent)
                  );
                  return;
                }

                // Detecting external navigation is _much_ harder.
                // Unfortunately we need to rewrite the URL to redirect via the request handler, and poll for a local storage key.
                // This is only a problem if the user decides to copy the link from the context menu and share it,
                // since some may argue the link looks "obscure".
                var requestId = ("" + Math.random())
                  .replace(".", "")
                  .substring(1, 8);
                if (!internalUrl) {
                  if (!trackerConfig.captureContextMenu) return;
                  link.href =
                    MNT_URL + "=" + requestId + encodeURIComponent(originalUrl);

                  // Poll for the storage key where the request handler will write the request ID before it redirects
                  // the user if the link is opened.
                  listen(
                    window,
                    "storage",
                    (ev, unbind) =>
                      ev.key === CLIENT_CALLBACK_CHANNEL_ID &&
                      (ev.newValue &&
                        JSON.parse(ev.newValue)?.requestId === requestId &&
                        tracker(navigationEvent),
                      unbind())
                  );

                  // Switch the link back when the context menu closes.
                  listen(
                    document,
                    ["keydown", "keyup", "visibilitychange", "pointermove"],
                    (_, unbind) => {
                      unbind();

                      link.href = originalUrl;
                    }
                  );
                }
              }
              return;
            }

            if (ev.button <= 1) {
              if (!isHttpNavigation) {
                navigationEvent.self = F;
                tracker(navigationEvent);
              } else if (
                ev.button === 1 || //Middle-click: new tab.
                ev.ctrlKey || // New tab
                ev.shiftKey || // New window
                ev.altKey || // Download
                (attr(link, "target") && attr(link, "target") !== window.name)
              ) {
                navigationEvent.self = F;
                tracker(navigationEvent);
                pushNavigationSource(navigationEvent.clientId);

                return;
              } else if (!matchExHash(location.href, link.href)) {
                // No "real" navigation will happen if it is only the hash changing.
                navigationEvent.exit = navigationEvent.external;
                tracker(navigationEvent);
                pushNavigationSource(navigationEvent.clientId);
              }
            }
            return;
          }

          if (!isPointerEvent) {
            const cart = tryGetCartEventData(ev.target as Element);
            (cart || trackClicks) &&
              tracker(
                cart
                  ? ({
                      type: "cart_updated",
                      ...sharedEventProperties,
                      ...componentContext("cart_updated"),
                      ...cart,
                    } satisfies CartUpdatedEvent)
                  : ({
                      type: "component_click",
                      ...sharedEventProperties,
                      ...componentContext("component_click"),
                    } satisfies ComponentClickEvent)
              );
          }
          return;
        }
      );
    };

    trackDocument(document);
    onFrame(
      (frame) => frame.contentDocument && trackDocument(frame.contentDocument)
    );
  },
};
