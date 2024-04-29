import { parseTagString, type Tag } from "@tailjs/types";
import type { Nullish } from "@tailjs/util";
import {
  attr,
  attrs,
  bool,
  concat2,
  createElement,
  cssProperty,
  F,
  filter,
  flatMap,
  forAncestorsOrSelf,
  forEach,
  fun,
  get,
  hashSet,
  iterable,
  map,
  match,
  matches,
  nil,
  NodeWithParentElement,
  obj,
  regex,
  replace,
  size,
  str,
  T,
  test,
  trackerConfig,
  values,
  weakMap,
} from ".";
import type { BoundaryData, TagMappings } from "..";

export const boundaryData = weakMap<Node, BoundaryData<true>>();
export const getBoundaryData = (el: Node) => get(boundaryData, el);

export const trackerPropertyName = (name: string, css = F) =>
  (css ? "--track-" : "track-") + name;

// const trackerProperty = (
//   el: Element,
//   name: string,
//   value = attr(el, trackerPropertyName(name)),
//   css = cssProperty(el as Element, trackerPropertyName(name, T))
// ) => (value ? (css ? value + " " + css : value) : css);

type MatchAttributeRule = readonly [
  match: RegExp,
  selector?: string,
  baseRank?: string
];

type CacheMatchRules = [
  eligibleCache: { [name: string]: boolean },
  rules: MatchAttributeRule[] | Nullish
];

/**
 * Extracts an element's tags given an attribute name, and a list of rules about how to match..
 * Since this function is external, its local variables are added as local parameters. Don't tamper.
 *
 * An optional `eligibleCache` can be passed along to speed up rejecting attribute names that definitely don't match anything.
 */
const matchAttributeNames = (
  el: Element | Nullish,
  cached: CacheMatchRules | Nullish,
  tags: Set<string>,
  prefix?: string | boolean,
  value?: string,
  eligible?: boolean
) =>
  cached?.[1] &&
  forEach(
    attrs(el),
    (name) =>
      (cached[0][name] ??=
        ((eligible = F),
        str(
          (prefix =
            // Grrr.. we did not. Let's loop through them then.
            forEach(
              cached[1],
              ([match, selector, prefix], _, stop) =>
                test(name, match) &&
                // Sneakily we "delete" the eligible flag, so the skipNameCache's `??=` assignment will always be reevaluated.
                // If this code branch is never hit, we return the initial value `false`, and this check will never be performed again.
                // We do this check before the selector check, since this result is not generally cacheable.
                ((eligible = undefined), !selector || matches(el, selector)) &&
                stop(prefix ?? name)
            ))
        ) && // The empty string is also "true" since it means precense of the attribute without a value (as in `<div tag-yes />).
          (!(value = el!.getAttribute(name)!) || bool(value, false)) &&
          parseTagString(value, replace(prefix, /\-/g, ":"), tags),
        eligible))
  );

// We cache the tracker configuration's rules for tag mappings.
let cachedTagMapper: (el: Element, tags: Set<string>) => void = () => {};
let cachedMappings: TagMappings | undefined;
const parseTagAttributes = (el: Element, tags: Set<string>) => {
  if (cachedMappings === (cachedMappings = trackerConfig.tags)) {
    return cachedTagMapper(el, tags);
  }

  const parse = (rule: TagMappings[string]): MatchAttributeRule[] =>
      !rule
        ? []
        : regex(rule)
        ? [[rule]]
        : iterable(rule)
        ? flatMap(rule, parse)
        : [
            obj(rule)
              ? [regex(rule.match, false), rule.selector, rule.prefix]
              : [regex(rule, false)],
          ],
    cache: CacheMatchRules = [
      {},
      // Start by checking whether we have any of the good ol', documented, "tail.js official" tag attributes.
      [[/^(?:track\-)?tags?(?:$|\-)(.*)/], ...parse(values(cachedMappings))],
    ];

  (cachedTagMapper = (el: Element, tags: Set<string>) =>
    matchAttributeNames(el, cache, tags))(el, tags);
};

const cssPropertyWithBase = (el: Element, name: string) =>
  concat2(
    cssProperty(el, trackerPropertyName(name, T)),
    cssProperty(el, trackerPropertyName("base-" + name, T)),
    ""
  );

// We cannot cache as broadly for CSS based rules, so we cache per selector instead.
const parsedCssRules: {
  [rule: string]: CacheMatchRules;
} = {};

const parseCssMappingRules = (
  el: Element,
  tags: Set<string>,
  rulesString = cssPropertyWithBase(el, "attributes")
) => {
  matchAttributeNames(
    el,
    (parsedCssRules[rulesString] ??= [
      {},
      filter(
        match(
          rulesString,
          /(?:(\S+)\:\s*)?(?:\((\S+)\)|([^\s,:]+))\s*(?!\S*\:)/g,
          (_, prefix, rule1, rule2) =>
            [regex(rule1 || rule2, false), , prefix] as const,
          []
        ),
        T
      ),
    ]),
    tags
  );
  parseTagString(cssPropertyWithBase(el, "tags"), undefined, tags);
};

let currentBoundaryData: BoundaryData<true> | Nullish;
export const trackerProperty = (
  el: Element,
  name: string,
  inherit:
    | boolean
    | ((el: NodeWithParentElement, distance: number) => boolean) = F,
  boundaryData?: (el: BoundaryData<true>) => string | Nullish
): string | null =>
  (inherit
    ? forAncestorsOrSelf(
        el,
        (el, r) => r(trackerProperty(el, name, F)),
        fun(inherit, F)
      )
    : concat2(
        attr(el, trackerPropertyName(name)),
        cssProperty(el, trackerPropertyName(name, T))
      )) ??
  (boundaryData &&
    (currentBoundaryData = getBoundaryData(el)) &&
    boundaryData(currentBoundaryData)) ??
  nil;

let propertyValue: string | Nullish;
export const trackerFlag = (
  el: Element,
  name: string,
  inherit:
    | boolean
    | ((el: NodeWithParentElement, distance: number) => boolean) = F,
  boundaryData?: (data: BoundaryData) => boolean | Nullish
) =>
  (propertyValue = trackerProperty(el, name, inherit, boundaryData as any)) ===
    "" || (propertyValue == nil ? propertyValue : bool(propertyValue, T));

export type ParsedTags = { tags?: Tag[] };

export const parseTags = (
  sourceEl: Element | Nullish,
  stoppingCriterion?: (el: Element, distance: number) => boolean,
  elementTagData?: (el: Element) => Iterable<Tag | Nullish> | Nullish,
  tags?: Set<string>
): ParsedTags =>
  !sourceEl
    ? {}
    : ((tags ??= hashSet<string>()),
      parseCssMappingRules(sourceEl, tags),
      forAncestorsOrSelf(
        sourceEl,
        (el) => {
          parseTagAttributes(el, tags!);
          parseTagString(map(elementTagData?.(el)), undefined, tags!);
        },
        stoppingCriterion
      ),
      size(tags) ? { tags: [...tags] } : {});

let styleElement: Node;
export const injectCssDefaults = (document: Document) => {
  document.body.appendChild(
    (((styleElement =
      // --track-base-attributes and --track-base-tags are not set, since they are supposed to be inherited.
      createElement("style")).innerText = `* { ${trackerPropertyName(
      "tags",
      T
    )}:; ${trackerPropertyName("attributes", T)}:;}`),
    styleElement)
  );
};
