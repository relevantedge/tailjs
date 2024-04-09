import { cast, } from "@tailjs/types";
import { getVisibleDuration, isDataBoundaryCommand, isScanComponentsCommand, } from "..";
import { F, T, any, boundaryData, clear, concat, del, filter, flatMap, forAncestorsOrSelf, forEach, get, getRect, getScreenPos, getViewport, join, map, max, nil, parseTags, push, registerViewEndAction, scanAttributes, set, size, str, timeout, timer, trackerConfig, trackerFlag, trackerProperty, undefined, unshift, } from "../lib";
export const componentDomConfiguration = Symbol("DOM configuration");
export const parseActivationTags = (el) => parseTags(el, undefined, (el) => map(get(boundaryData, el)?.tags));
const hasComponentOrContent = (boundary) => boundary?.component || boundary?.content;
let entry;
export const parseBoundaryTags = (el) => parseTags(el, (ancestor) => ancestor !== el && !!hasComponentOrContent(get(boundaryData, ancestor)), (el) => (entry = get(boundaryData, el)) &&
    concat(flatMap([entry.component, entry.content], (item) => flatMap(item, (item) => map(item.tags, F))), entry.tags));
let content;
const stripRects = (component, keep) => keep
    ? component
    : {
        ...component,
        rect: undefined,
        content: (content = component.content) &&
            map(content, (content) => ({ ...content, rect: undefined })),
    };
const setContext = timeout();
export const getComponentContext = (el, directOnly = F) => {
    clear(setContext);
    let collectedContent = [];
    let collected = [];
    let includeState = 0 /* IncludeState.Secondary */;
    let rect;
    forAncestorsOrSelf(el, (el) => {
        const entry = get(boundaryData, el);
        if (!entry) {
            return;
        }
        if (hasComponentOrContent(entry)) {
            const components = filter(entry.component, (entry) => includeState === 0 /* IncludeState.Secondary */ ||
                (!directOnly &&
                    ((includeState === 1 /* IncludeState.Primary */ &&
                        entry.track?.secondary !== T) ||
                        entry.track?.promote)));
            rect =
                (any(components, (item) => item.track?.region) && getRect(el)) ||
                    undefined;
            const tags = parseBoundaryTags(el);
            entry.content &&
                unshift(collectedContent, ...map(entry.content, (item) => ({
                    ...item,
                    rect,
                    ...tags,
                })));
            components.length &&
                (unshift(collected, ...map(components, (item) => ((includeState = max(includeState, item.track?.secondary // INV: Secondary components are only included here if we did not have any components from a child element.
                    ? 1 /* IncludeState.Primary */
                    : 2 /* IncludeState.Promoted */)),
                    stripRects({
                        ...item,
                        content: collectedContent,
                        rect,
                        ...tags,
                    }, !!rect)))),
                    (collectedContent = []));
        }
        const area = entry.area || trackerProperty(el, "area");
        area && unshift(collected, ...map(area));
    });
    let areaPath;
    let components;
    if (collectedContent.length) {
        // Content without a contaning component is gathered in an ID-less component.
        push(collected, stripRects({ id: "", rect, content: collectedContent }));
    }
    forEach(collected, (item) => {
        if (str(item)) {
            push((areaPath ??= []), item);
        }
        else {
            item.area ??= join(areaPath, "/");
            unshift((components ??= []), item);
        }
    });
    return components || areaPath
        ? { components: components, area: join(areaPath, "/") }
        : undefined;
};
const intersectionHandler = Symbol();
export const components = {
    id: "components",
    setup(tracker) {
        const observer = new IntersectionObserver((els) => forEach(els, ({ target, isIntersecting, boundingClientRect, intersectionRatio }) => target[intersectionHandler]?.(isIntersecting, boundingClientRect, intersectionRatio)), 
        // Low thresholds used to be able to handle components larger than viewports
        { threshold: [0.05, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.6, 0.75] });
        function registerComponent({ boundary: el, ...command }) {
            let update = "add" in command
                ? (current) => cast({
                    ...current,
                    component: concat(current?.component, command.component),
                    content: concat(current?.content, command.content),
                    area: command?.area ?? current?.area,
                    tags: concat(current?.tags, command.tags),
                    cart: command.cart ?? current?.cart,
                    track: command.track ?? current?.track,
                })
                : command["update"];
            set(boundaryData, el, update ?? command);
            let components;
            if ((components = filter(get(boundaryData, el)?.component, (cmp) => 
            // Impression settings from the DOM/CSS are ignorred for secondary and inferred components (performance thing)
            cmp.track?.impressions ||
                (cmp.track?.secondary ?? cmp.inferred) !== T))) {
                if (!size(components)) {
                    return;
                }
                let visible = F;
                let impressions = 0;
                let event = nil;
                let fold;
                const captureState = timeout();
                const t = timer(() => getVisibleDuration(), F);
                el[intersectionHandler] = (intersecting, rect, ratio) => {
                    intersecting =
                        ratio >= 0.75 ||
                            (rect.top < (fold = window.innerHeight / 2) && rect.bottom > fold);
                    t(intersecting);
                    if (visible !== (visible = intersecting)) {
                        //el["style"].border = visible ? "2px solid blue" : "";
                        if (visible) {
                            captureState(() => {
                                ++impressions;
                                if (!event) {
                                    const events = filter(map(components, (cmp) => ((cmp.track?.impressions ||
                                        trackerFlag(el, "impressions", T, (data) => data.track?.impressions)) &&
                                        cast({
                                            type: "IMPRESSION",
                                            pos: getScreenPos(el),
                                            viewport: getViewport(),
                                            ...getComponentContext(el, T),
                                        })) ||
                                        nil));
                                    event = registerViewEndAction(() => push(tracker, ...map(events, (ev) => (((ev.duration = t()), (ev.impressions = impressions)),
                                        ev))));
                                }
                            }, -trackerConfig.impressionThreshold);
                        }
                        else {
                            clear(captureState); // Not visible, clear timeout.
                        }
                    }
                    !el.isConnected && (event?.(), (event = nil));
                };
                observer.observe(el);
            }
        }
        return {
            decorate(eventData) {
                // Strip tracking configuration.
                forEach(eventData.components, (component) => del(component, "track"));
            },
            processCommand(cmd) {
                return isDataBoundaryCommand(cmd)
                    ? (registerComponent(cmd), T)
                    : isScanComponentsCommand(cmd)
                        ? (map(scanAttributes(cmd.scan.attribute, cmd.scan.components), registerComponent),
                            T)
                        : F;
            },
        };
    },
};
//# sourceMappingURL=components.js.map