import { cast, isViewEndedEvent, } from "@tailjs/types";
import { getComponentContext, onFrame, pushNavigationSource, tryGetCartEventData, } from "..";
import { CONTEXT_MENU_COOKIE } from "@constants";
import { parseActivationTags } from "..";
import { F, MNT_URL, T, any, attr, attrl, clear, cookies, del, document, encode, equals, forAncestorsOrSelf, getBoundaryData, getScreenPos, getViewport, isInternalUrl, keys, listen, location, map, mapUrl, matchExHash, navigator, nextId, nil, noopAction, obj, parseDomain, push, registerViewEndAction, tagName, timeout, trackerConfig, trackerFlag, tryCatch, window, } from "../lib";
const isLinkElement = (el, href = tagName(el) === "A" && attr(el, "href")) => href && href != "#" && !href.startsWith("javascript:");
const isClickable = (el, t = tagName(el), attr = trackerFlag(el, "button")) => attr !== F &&
    (equals(t, "A", "BUTTON") ||
        (t === "INPUT" && equals(attrl(el, "type"), "button", "submit")) ||
        attr === T);
function getElementLabel(el, container) {
    let info;
    forAncestorsOrSelf(el ?? container, (el) => equals(tagName(el), "IMG") || el === container
        ? ((info = {
            element: {
                tagName: el.tagName,
                text: attr(el, "title") ||
                    attr(el, "alt") ||
                    el.innerText?.trim().substring(0, 100) ||
                    undefined,
            },
        }),
            F)
        : T);
    return info;
}
export const userInteraction = {
    id: "navigation",
    setup(tracker) {
        const pollContextCookie = timeout();
        // There can be all kinds of fishy navigation logic happening, so it is not enough just to look at link (<A>) clicks.
        // Hence, when navigation occurs (in the current tab), we do not send the event before we have an VIEW_END.
        // We rely on that the logic for VIEW_END takes care all the different ways to navigate (history.push etc.) so this is where we know that navigation happened for sure.
        let pendingNavigationEvent = noopAction;
        const stripPositions = (el, hitTest) => hitTest
            ? el
            : (map(keys(el), (key) => key === "rect" ||
                //key === "pos"  Changed so pos is always included.
                key === "viewport"
                ? del(el, key)
                : obj(el[key]) &&
                    map(el[key], (item) => stripPositions(item, hitTest))),
                el);
        const trackDocument = (document) => {
            listen(document, ["click", "contextmenu", "auxclick"], (ev) => {
                // Cancel whatever we might be waiting for.
                pendingNavigationEvent?.(F);
                let trackClicks;
                let trackRegion;
                let clickableElement = nil; // Typescript insists this is never?
                let nav = F;
                forAncestorsOrSelf(ev.target, (el) => {
                    clickableElement ??= isClickable(el) ? el : nil;
                    nav = nav || tagName(el) === "NAV";
                    let cmp;
                    trackClicks ??=
                        trackerFlag(el, "clicks", T, (data) => data.track?.clicks) ??
                            ((cmp = getBoundaryData(el)?.component) &&
                                any(cmp, (cmp) => cmp.track?.clicks !== F));
                    trackRegion ??=
                        trackerFlag(el, "region", T, (data) => data.track?.region) ??
                            ((cmp = getBoundaryData(el)?.component) &&
                                any(cmp, (cmp) => cmp.track?.region));
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
                    ...tags,
                    timing: {},
                };
                if (isLinkElement(clickableElement)) {
                    const external = clickableElement.hostname !== location.hostname;
                    const { domain, href } = parseDomain(clickableElement.href);
                    if (clickableElement.host === location.host &&
                        clickableElement.pathname === location.pathname &&
                        clickableElement.search === location.search) {
                        if (clickableElement.hash === "#") {
                            // Don't care about that one.
                            return;
                        }
                        if (clickableElement.hash !== location.hash) {
                            push(tracker, cast({
                                type: "ANCHOR_NAVIGATION",
                                anchor: clickableElement.hash,
                                ...sharedEventProperties,
                            }));
                        }
                        return;
                    }
                    const navigationEvent = cast({
                        id: nextId(),
                        type: "NAVIGATION",
                        href: external ? clickableElement.href : href,
                        external,
                        domain,
                        self: T,
                        anchor: clickableElement.hash,
                        ...sharedEventProperties,
                    });
                    if (ev.type === "contextmenu") {
                        const referrerConsumed = pushNavigationSource(navigationEvent.id);
                        const currentUrl = clickableElement.href;
                        const internalUrl = isInternalUrl(currentUrl);
                        if (!internalUrl) {
                            if (!trackerConfig.captureContextMenu)
                                return;
                            clickableElement.href = mapUrl(MNT_URL, "=", encode(currentUrl));
                            tryCatch(() => navigator.userActivation?.isActive &&
                                navigator.clipboard.writeText(currentUrl));
                        }
                        const flag = Date.now();
                        cookies(CONTEXT_MENU_COOKIE, flag, 11000);
                        pollContextCookie(() => {
                            clickableElement.href = currentUrl;
                            if (!referrerConsumed() ||
                                +cookies(CONTEXT_MENU_COOKIE) === flag + 1) {
                                cookies(CONTEXT_MENU_COOKIE, nil);
                                navigationEvent.self = F;
                                push(tracker, navigationEvent);
                                clear(pollContextCookie);
                            }
                        }, -100);
                        let unbindAll = listen(document, ["keydown", "keyup", "visibilitychange", "pointermove"], () => unbindAll() &&
                            clear(pollContextCookie, 10000, () => cookies(CONTEXT_MENU_COOKIE, "")));
                    }
                    else if (ev.button <= 1) {
                        if (ev.button === 1 || //Middle-click: new tab.
                            ev.ctrlKey || // New tab
                            ev.shiftKey || // New window
                            ev.altKey || // Download
                            attr(clickableElement, "target") !== window.name) {
                            pushNavigationSource(navigationEvent.id);
                            navigationEvent.self = F;
                            // Fire immediately, we are staying on the page.
                            push(tracker, navigationEvent);
                            return;
                        }
                        else if (!matchExHash(location.href, clickableElement.href)) {
                            navigationEvent.exit = navigationEvent.external;
                            // No "real" navigation will happen if it is only the hash changing.
                            pushNavigationSource(navigationEvent.id);
                        }
                        // If it so happened that navigation happened we will send it on VIEW_END.
                        pendingNavigationEvent = registerViewEndAction(() => push(tracker, navigationEvent));
                    }
                    return;
                }
                const cart = tryGetCartEventData(ev.target);
                (cart || trackClicks) &&
                    push(tracker, cart
                        ? cast({
                            type: "CART_UPDATED",
                            ...sharedEventProperties,
                            ...cart,
                        })
                        : cast({
                            type: "COMPONENT_CLICK",
                            ...sharedEventProperties,
                        }));
                return;
            });
        };
        trackDocument(document);
        onFrame((frame) => frame.contentDocument && trackDocument(frame.contentDocument));
        return {
            decorate(eventData) {
                if (isViewEndedEvent(eventData)) {
                    pendingNavigationEvent(T);
                }
            },
        };
    },
};
//# sourceMappingURL=userInteraction.js.map