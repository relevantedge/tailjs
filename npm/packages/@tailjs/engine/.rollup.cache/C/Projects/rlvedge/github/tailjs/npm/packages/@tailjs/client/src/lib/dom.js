import { cast, } from "@tailjs/types";
import { body, document, entries, err, F, filter, fun, lowerCase, map, match, MAX_SAFE_INTEGER, nil, parseBoolean, push, replace, round, T, undefined, window, } from ".";
export let MAX_ANCESTOR_DISTANCE = MAX_SAFE_INTEGER;
export const forAncestorsOrSelf = (el, action, stoppingCriterion = (el, distance) => distance >= MAX_ANCESTOR_DISTANCE) => {
    let i = 0, returnValue, stop = F;
    while (el?.["nodeType"] === 1 &&
        !stoppingCriterion(el, i++) &&
        action(el, (value, replace) => (value != nil &&
            ((returnValue = value), (stop = replace !== T && returnValue != nil)),
            T), i - 1) !== F &&
        !stop) {
        const prev = el;
        el = el.parentElement;
        if (el === nil && prev?.ownerDocument !== document) {
            el = prev?.ownerDocument.defaultView?.frameElement;
        }
    }
    return returnValue;
};
export const inElementScope = (node, name) => forAncestorsOrSelf(node, (el, value) => value(tagName(el) === name || undefined));
export const scopeAttr = (node, name) => forAncestorsOrSelf(node, (el, value) => value(attr(el, name)));
export const attrl = (node, name) => lowerCase(attr(node, name));
let value;
export const attrb = (node, name) => (value = attr(node, name)) === "" || parseBoolean(value);
export const attrn = (node, name) => parseFloat("" + (value = attr(node, name))) ?? undefined;
export const attrs = (node) => node?.getAttributeNames();
export const attr = (node, name, value) => !node?.getAttribute
    ? nil
    : value === undefined
        ? node.getAttribute(name)
        : (value === nil
            ? node.removeAttribute(name)
            : node.setAttribute(name, value),
            value);
export const cssProperty = (el, name) => getComputedStyle(el).getPropertyValue(name) || nil;
let parameters;
export const define = (target, props) => ((parameters = {}),
    (map(filter(entries(props), ([_, value]) => value != nil), ([name, [value, writable = F] = []]) => (parameters[name] = {
        writable,
        configurable: writable,
        value,
    })),
        Object.defineProperties(target, parameters)));
export const tagName = (el) => (el != nil ? el.tagName : nil);
let pos;
export const relativeScrollPos = () => ((pos = scrollPos(F)),
    {
        x: pos.x / (body.offsetWidth - window.innerWidth) || 0,
        y: pos.y / (body.offsetHeight - window.innerHeight) || 0,
    });
export const scrollPos = (int) => ({
    x: round(scrollX, int),
    y: round(scrollY, int),
});
export const matchExHash = (href1, href2) => replace(href1, /#.*$/, "") === replace(href2, /#.*$/, "");
let screenPos;
export const getScreenPos = (el, mouseEvent, includeFold = T) => (screenPos = getPos(el, mouseEvent)) &&
    cast({
        xpx: screenPos.x,
        ypx: screenPos.y,
        x: round(screenPos.x / body.offsetWidth, 4),
        y: round(screenPos.y / body.offsetHeight, 4),
        pageFolds: includeFold ? screenPos.y / window.innerHeight : undefined,
    });
let x, y;
export const getPos = (el, mouseEvent) => !!mouseEvent?.["pointerType"] && mouseEvent?.pageY != nil
    ? { x: mouseEvent.pageX, y: mouseEvent.pageY }
    : el
        ? (({ x, y } = getRect(el)), { x, y })
        : undefined;
let rect;
export const getRect = (el) => el
    ? ((rect = el.getBoundingClientRect()),
        (pos = scrollPos(F)),
        {
            x: round(rect.left + pos.x),
            y: round(rect.top + pos.y),
            width: round(rect.width),
            height: round(rect.height),
        })
    : undefined;
export const listen = (el, names, cb, capture = T, passive = T) => {
    let unbinders = [];
    return (map(names, (name, i) => {
        const mapped = (ev) => {
            cb(ev, unbinders[i]);
        };
        push(unbinders, () => el.removeEventListener(name, mapped, capture));
        return el.addEventListener(name, mapped, { capture, passive });
    }),
        () => unbinders.length > 0 && map(unbinders, (unbind) => unbind())
            ? ((unbinders = []), T)
            : F);
};
export const listenOnce = (el, names, cb, useCapture) => listen(el, names, (event, unbind) => (cb(event, unbind), unbind()), useCapture);
export const parseDomain = (href) => href == nil
    ? undefined
    : match(href, /^(?:([a-zA-Z0-9]+):)?(?:\/\/)?([^\s\/]*)/, (all, protocol, domainName) => domainName
        ? {
            href: href.substring(all.length),
            domain: {
                protocol,
                domainName,
            },
        }
        : { href });
export const getViewportSize = () => ({
    width: window.innerWidth,
    height: window.innerHeight,
});
export const getViewport = () => ((pos = scrollPos(T)),
    {
        ...pos,
        width: window.innerWidth,
        height: window.innerHeight,
        totalWidth: body.offsetWidth,
        totalHeight: body.offsetHeight,
    });
export const tryAsync = async (action, error, always) => {
    try {
        return await (fun(action) ? action() : action);
    }
    catch (e) {
        console.error(e);
        return await (fun(error) ? error(e) : e);
    }
    finally {
        await always?.();
    }
};
export const tryCatch = (action, error = (e) => err(nil, nil, e), finallyCallback) => {
    const unbind = listen(window, "error", (ev) => ev.stopImmediatePropagation());
    try {
        return action();
    }
    catch (e) {
        return error === F
            ? undefined
            : fun(error)
                ? error(e)
                : (push(error, e) ?? err(nil, nil, e), undefined);
    }
    finally {
        unbind();
        finallyCallback?.();
    }
};
//# sourceMappingURL=dom.js.map