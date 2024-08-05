import { CLIENT_CALLBACK_CHANNEL_ID } from "@constants";

import {
  AnchorNavigationEvent,
  CartUpdatedEvent,
  ComponentClickEvent,
  ComponentClickIntentEvent,
  ComponentElementInfo,
  NavigationEvent,
  ScreenPosition,
  UserInteractionEvent,
} from "@tailjs/types";
import {
  F,
  T,
  createTimeout,
  ellipsis,
  equalsAny,
  forEach,
  get,
  isObject,
  map,
  nil,
  parseUri,
  push,
  remove,
  restrict,
  some,
  stop,
  update,
  type Nullish,
} from "@tailjs/util";
import {
  TrackerExtensionFactory,
  getComponentContext,
  getViewTimeOffset,
  onFrame,
  parseActivationTags,
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
  normalizedAttribute,
  overlay,
  tagName,
  trackerConfig,
  trackerFlag,
} from "../lib";

const isLinkElement = (
  el: Element,
  href: any = tagName(el) === "A" && attr(el, "href")
): el is HTMLAnchorElement =>
  href && href != "#" && !href.startsWith("javascript:");

const isClickable = (
  el: Element,
  t = tagName(el),
  attr = trackerFlag(el, "button")
): el is HTMLElement =>
  attr !== F &&
  (equalsAny(t, "A", "BUTTON") ||
    (t === "INPUT" &&
      equalsAny(normalizedAttribute(el, "type"), "button", "submit")) ||
    attr === T);

const getElementInfo = (el: Element, includeRect = false) => ({
  tagName: el.tagName,
  text: ellipsis(
    attr(el, "title")?.trim() ||
      attr(el, "alt")?.trim() ||
      (el as HTMLElement).innerText?.trim(),
    100
  ),
  href: (el as any).href?.toString(),
  rect: includeRect ? getRect(el) : undefined,
});
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
        ["click", "contextmenu", "auxclick"],
        (ev: MouseEvent) => {
          let trackClicks: boolean | Nullish;
          let trackRegion: boolean | Nullish;
          let clickableElement: HTMLElement | undefined;
          let containerElement: Element | undefined;

          let nav = F;

          let clickables: ComponentElementInfo[] | undefined;

          forAncestorsOrSelf<boolean>(ev.target, (el) => {
            isClickable(el) && (clickableElement ??= el);
            nav = nav || tagName(el) === "NAV";

            const boundary = getBoundaryData(el);
            const components = boundary?.component;
            if (!ev.button && components?.length && !clickables) {
              forEach(
                el.querySelectorAll("a,button"),
                (clickable) =>
                  isClickable(clickable) &&
                  ((clickables ??= []).length > 3
                    ? stop() // If there are more than two clickables, there is presumably not any missed click intent.
                    : clickables.push({
                        ...getElementInfo(clickable, true),
                        component: forAncestorsOrSelf(
                          clickable,
                          (
                            child,
                            r,
                            _,
                            childComponents = getBoundaryData(child)?.component
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
          const clickIntent = clickables && !clickableElement && trackClicks;

          const componentContext = getComponentContext(
            containerElement,
            false,
            clickIntent
          );
          const tags = parseActivationTags(containerElement);
          trackClicks ??= !nav;
          trackRegion ??= T;

          const sharedEventProperties = {
            ...(trackRegion
              ? {
                  pos: getScreenPos(clickableElement, ev),
                  viewport: getViewport(),
                }
              : nil),
            ...getElementLabel(ev.target, containerElement),
            ...componentContext,
            timeOffset: getViewTimeOffset(),
            ...tags,
          };
          if (!clickableElement) {
            clickIntent &&
              update(activeEventClicks, containerElement, (current) => {
                const pos = getPos(containerElement!, ev);
                if (!current) {
                  // Reuse the same event and only add the new click coordinates
                  // if the element is clicked again to reduce data.
                  const intentEvent = restrict<ComponentClickIntentEvent>({
                    type: "component_click_intent",
                    ...sharedEventProperties,
                    clicks: (current = [pos]),

                    clickables,
                  });

                  tracker.events.registerEventPatchSource(
                    intentEvent,
                    () => ({
                      clicks: get(activeEventClicks, containerElement!),
                    }),
                    true,
                    containerElement
                  );
                } else {
                  push(current, pos);
                }

                return current;
              });
            //  ,              overlay(containerElement, "Click intent", true)

            return;
          }

          if (isLinkElement(clickableElement!)) {
            const link = clickableElement;
            const external = link.hostname !== location.hostname;

            const {
              host,
              scheme,
              source: href,
            } = parseUri(link.href, false, true);
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
                if (ev.button === 0)
                  tracker(
                    restrict<AnchorNavigationEvent>({
                      type: "anchor_navigation",
                      anchor: link.hash,
                      ...sharedEventProperties,
                    })
                  );
              }
              return;
            }

            const navigationEvent: NavigationEvent = restrict<NavigationEvent>({
              clientId: nextId(),
              type: "navigation",
              href: external ? link.href : href,
              external,
              domain: { host, scheme },
              self: T,
              anchor: link.hash,
              ...sharedEventProperties,
            });

            // There does not seem to be any way to detect when the user clicks
            // "Open link in new tab/window", so we need to do a little extra gymnastics to capture it.
            if (ev.type === "contextmenu") {
              const originalUrl = link.href;
              const internalUrl = isInternalUrl(originalUrl);
              if (internalUrl) {
                // Detecting internal navigation is not that hard.
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

                createTimeout;
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
              return;
            }

            if (ev.button <= 1) {
              if (
                ev.button === 1 || //Middle-click: new tab.
                ev.ctrlKey || // New tab
                ev.shiftKey || // New window
                ev.altKey || // Download
                attr(link, "target") !== window.name
              ) {
                pushNavigationSource(navigationEvent.clientId);
                navigationEvent.self = F;
                // Fire immediately, we are staying on the page.
                tracker(navigationEvent);
                return;
              } else if (!matchExHash(location.href, link.href)) {
                navigationEvent.exit = navigationEvent.external;
                // No "real" navigation will happen if it is only the hash changing.
                pushNavigationSource(navigationEvent.clientId);
              }

              // // If it so happened that navigation happened we will send it on VIEW_END.
              // pendingNavigationEvent = registerViewEndAction(() =>
              //   tracker(navigationEvent)
              // );
            }
            return;
          }

          const cart = tryGetCartEventData(ev.target as Element);
          (cart || trackClicks) &&
            tracker(
              cart
                ? restrict<CartUpdatedEvent>({
                    type: "cart_updated",
                    ...sharedEventProperties,
                    ...cart,
                  })
                : restrict<ComponentClickEvent>({
                    type: "component_click",
                    ...sharedEventProperties,
                  })
            );
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
