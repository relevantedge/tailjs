import { parseTagString } from "@tailjs/types";
import { attr, attrs, bool, concat2, createElement, cssProperty, F, filter, flatMap, forAncestorsOrSelf, forEach, fun, get, hashSet, iterable, map, match, matches, nil, obj, regex, replace, size, str, T, test, trackerConfig, values, weakMap, } from ".";
export const boundaryData = weakMap();
export const getBoundaryData = (el) => get(boundaryData, el);
export const trackerPropertyName = (name, css = F) => (css ? "--track-" : "track-") + name;
/**
 * Extracts an element's tags given an attribute name, and a list of rules about how to match..
 * Since this function is external, its local variables are added as local parameters. Don't tamper.
 *
 * An optional `eligibleCache` can be passed along to speed up rejecting attribute names that definitely don't match anything.
 */
const matchAttributeNames = (el, cached, tags, prefix, value, eligible) => cached?.[1] &&
    forEach(attrs(el), (name) => (cached[0][name] ??=
        ((eligible = F),
            str((prefix =
                // Grrr.. we did not. Let's loop through them then.
                forEach(cached[1], ([match, selector, prefix], _, stop) => test(name, match) &&
                    // Sneakily we "delete" the eligible flag, so the skipNameCache's `??=` assignment will always be reevaluated.
                    // If this code branch is never hit, we return the initial value `false`, and this check will never be performed again.
                    // We do this check before the selector check, since this result is not generally cacheable.
                    ((eligible = undefined), !selector || matches(el, selector)) &&
                    stop(prefix ?? name)))) && // The empty string is also "true" since it means precense of the attribute without a value (as in `<div tag-yes />).
                (!(value = el.getAttribute(name)) || bool(value, false)) &&
                parseTagString(value, replace(prefix, /\-/g, ":"), tags),
            eligible)));
// We cache the tracker configuration's rules for tag mappings.
let cachedTagMapper = () => { };
let cachedMappings;
const parseTagAttributes = (el, tags) => {
    if (cachedMappings === (cachedMappings = trackerConfig.tags)) {
        return cachedTagMapper(el, tags);
    }
    const parse = (rule) => !rule
        ? []
        : regex(rule)
            ? [[rule]]
            : iterable(rule)
                ? flatMap(rule, parse)
                : [
                    obj(rule)
                        ? [regex(rule.match, false), rule.selector, rule.prefix]
                        : [regex(rule, false)],
                ], cache = [
        {},
        // Start by checking whether we have any of the good ol', documented, "tail.js official" tag attributes.
        [[/^(?:track\-)?tags?(?:$|\-)(.*)/], ...parse(values(cachedMappings))],
    ];
    (cachedTagMapper = (el, tags) => matchAttributeNames(el, cache, tags))(el, tags);
};
const cssPropertyWithBase = (el, name) => concat2(cssProperty(el, trackerPropertyName(name, T)), cssProperty(el, trackerPropertyName("base-" + name, T)), "");
// We cannot cache as broadly for CSS based rules, so we cache per selector instead.
const parsedCssRules = {};
const parseCssMappingRules = (el, tags, rulesString = cssPropertyWithBase(el, "attributes")) => {
    matchAttributeNames(el, (parsedCssRules[rulesString] ??= [
        {},
        filter(match(rulesString, /(?:(\S+)\:\s*)?(?:\((\S+)\)|([^\s,:]+))\s*(?!\S*\:)/g, (_, prefix, rule1, rule2) => [regex(rule1 || rule2, false), , prefix], []), T),
    ]), tags);
    parseTagString(cssPropertyWithBase(el, "tags"), undefined, tags);
};
let currentBoundaryData;
export const trackerProperty = (el, name, inherit = F, boundaryData) => (inherit
    ? forAncestorsOrSelf(el, (el, r) => r(trackerProperty(el, name, F)), fun(inherit, F))
    : concat2(attr(el, trackerPropertyName(name)), cssProperty(el, trackerPropertyName(name, T)))) ??
    (boundaryData &&
        (currentBoundaryData = getBoundaryData(el)) &&
        boundaryData(currentBoundaryData)) ??
    nil;
let propertyValue;
export const trackerFlag = (el, name, inherit = F, boundaryData) => (propertyValue = trackerProperty(el, name, inherit, boundaryData)) ===
    "" || (propertyValue == nil ? propertyValue : bool(propertyValue, T));
export const parseTags = (sourceEl, stoppingCriterion, elementTagData, tags) => !sourceEl
    ? {}
    : ((tags ??= hashSet()),
        parseCssMappingRules(sourceEl, tags),
        forAncestorsOrSelf(sourceEl, (el) => {
            parseTagAttributes(el, tags);
            parseTagString(map(elementTagData?.(el)), undefined, tags);
        }, stoppingCriterion),
        size(tags) ? { tags: [...tags] } : {});
let styleElement;
export const injectCssDefaults = (document) => {
    document.body.appendChild((((styleElement =
        // --track-base-attributes and --track-base-tags are not set, since they are supposed to be inherited.
        createElement("style")).innerText = `* { ${trackerPropertyName("tags", T)}:; ${trackerPropertyName("attributes", T)}:;}`),
        styleElement));
};
//# sourceMappingURL=dom-data.js.map