import {
  AnchorNavigationEvent,
  CartUpdatedEvent,
  ComponentClickEvent,
  ConfiguredComponent,
  NavigationEvent,
  UserInteractionEvent,
} from "@tailjs/types";
import {
  TrackerExtensionFactory,
  getComponentContext,
  getViewTimeOffset,
  onFrame,
  pushNavigationSource,
  tryGetCartEventData,
} from "..";

import {
  F,
  T,
  array,
  equalsAny,
  isObject,
  map,
  nil,
  parseUri,
  push,
  remove,
  restrict,
  some,
  createTimeout,
  tryCatch,
  tryCatchAsync,
  type Nullish,
} from "@tailjs/util";
import { parseActivationTags } from "..";
import {
  MNT_URL,
  attr,
  body,
  forAncestorsOrSelf,
  getBoundaryData,
  getScreenPos,
  getViewport,
  isInternalUrl,
  listen,
  mapUrl,
  matchExHash,
  nextId,
  normalizedAttribute,
  tagName,
  trackerConfig,
  trackerFlag,
} from "../lib";
import { CLIENT_CALLBACK_CHANNEL_ID } from "@constants";

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

function getElementLabel(el: Element | EventTarget | null, container: Element) {
  let info: Pick<UserInteractionEvent, "element"> | undefined;
  forAncestorsOrSelf(el ?? container, (el) =>
    tagName(el) === "IMG" || el === container
      ? ((info = {
          element: {
            tagName: el.tagName,
            text:
              attr(el, "title") ||
              attr(el, "alt") ||
              (el as HTMLElement).innerText?.trim().substring(0, 100) ||
              undefined,
          },
        }),
        F)
      : T
  );
  return info;
}
export const userInteraction: TrackerExtensionFactory = {
  id: "navigation",

  setup(tracker) {
    // There can be all kinds of fishy navigation logic happening, so it is not enough just to look at link (<A>) clicks.
    // Hence, when navigation occurs (in the current tab), we do not send the event before we have an VIEW_END.
    // We rely on that the logic for VIEW_END takes care all the different ways to navigate (history.push etc.) so this is where we know that navigation happened for sure.

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

          let nav = F;

          forAncestorsOrSelf<boolean>(ev.target, (el) => {
            isClickable(el) && (clickableElement ??= el);
            nav = nav || tagName(el) === "NAV";

            let cmp: readonly ConfiguredComponent[] | Nullish;

            trackClicks ??=
              trackerFlag(el, "clicks", T, (data) => data.track?.clicks) ??
              ((cmp = array(getBoundaryData(el)?.component)) &&
                some(cmp, (cmp) => cmp.track?.clicks !== F));
            trackRegion ??=
              trackerFlag(el, "region", T, (data) => data.track?.region) ??
              ((cmp = getBoundaryData(el)?.component) &&
                some(cmp, (cmp) => cmp.track?.region));
          });

          if (!clickableElement) {
            return;
          }
          const componentContext = getComponentContext(clickableElement);
          const tags = parseActivationTags(clickableElement);
          trackClicks ??= !nav;
          trackRegion ??= T;

          const sharedEventProperties = {
            ...(trackRegion
              ? {
                  pos: getScreenPos(clickableElement, ev),
                  viewport: getViewport(),
                }
              : nil),
            ...getElementLabel(ev.target, clickableElement),
            ...componentContext,
            timeOffset: getViewTimeOffset(),
            ...tags,
          };

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
                  push(
                    tracker,
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
                  push(tracker, navigationEvent)
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
                      push(tracker, navigationEvent),
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
                push(tracker, navigationEvent);
                return;
              } else if (!matchExHash(location.href, link.href)) {
                navigationEvent.exit = navigationEvent.external;
                // No "real" navigation will happen if it is only the hash changing.
                pushNavigationSource(navigationEvent.clientId);
              }

              // // If it so happened that navigation happened we will send it on VIEW_END.
              // pendingNavigationEvent = registerViewEndAction(() =>
              //   push(tracker, navigationEvent)
              // );
            }
            return;
          }

          const cart = tryGetCartEventData(ev.target as Element);
          (cart || trackClicks) &&
            push(
              tracker,
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
