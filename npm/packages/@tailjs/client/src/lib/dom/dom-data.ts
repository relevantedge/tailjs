import {
  ParsableTags,
  TagCollection,
  collectTags,
  type Tag,
} from "@tailjs/types";
import {
  F,
  T,
  concat,
  flatMap,
  flatMap2,
  forEach2,
  isFunction,
  isIterable,
  isPlainObject,
  isRegEx,
  isString,
  join2,
  matches,
  nil,
  parseBoolean,
  parseRegex,
  replace,
  stop,
  testRegex,
  type Nullish,
} from "@tailjs/util";

import {
  NodeWithParentElement,
  attr,
  attributeNames,
  createElement,
  cssProperty,
  forAncestorsOrSelf,
  matchSelector,
  trackerConfig,
} from "..";
import type { BoundaryData, TagMappings } from "../..";

export const boundaryData = new WeakMap<Node, BoundaryData<true>>();
export const getBoundaryData = (el: Node) => boundaryData.get(el);

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
  tags: TagCollection,
  prefix?: string | boolean,
  value?: string,
  eligible?: boolean
) =>
  cached?.[1] &&
  forEach2(
    attributeNames(el),
    (name) =>
      (cached[0][name] ??=
        ((eligible = F),
        isString(
          (prefix =
            // No cache. Let's loop through them then.
            forEach2(
              cached[1],
              ([match, selector, prefix], _) =>
                testRegex(name, match) &&
                // Sneakily we "delete" the eligible flag, so the skipNameCache's `??=` assignment will always be reevaluated.
                // If this code branch is never hit, we return the initial value `false`, and this check will never be performed again.
                // We do this check before the selector check, since this result is not generally cacheable.
                ((eligible = undefined),
                !selector || matchSelector(el, selector)) &&
                stop(prefix ?? name)
            ))
        ) && // The empty string is also "true" since it means presence of the attribute without a value (as in `<div tag-yes />).
          (!(value = el!.getAttribute(name)!) || parseBoolean(value)) &&
          collectTags(value, replace(prefix, /\-/g, ":"), tags),
        eligible))
  );

// We cache the tracker configuration's rules for tag mappings.
let cachedTagMapper: (el: Element, tags: TagCollection) => void = () => {};
let cachedMappings: TagMappings | undefined;
const parseTagAttributes = (el: Element, tags: TagCollection) => {
  if (cachedMappings === (cachedMappings = trackerConfig.tags)) {
    return cachedTagMapper(el, tags);
  }

  const parse = (rule: TagMappings[string]): MatchAttributeRule[] =>
      !rule
        ? []
        : isRegEx(rule)
        ? [[rule]]
        : isIterable(rule)
        ? flatMap(rule, parse)
        : [
            isPlainObject(rule)
              ? [parseRegex(rule.match)!, rule.selector, rule.prefix]
              : [parseRegex(rule)!],
          ],
    cache: CacheMatchRules = [
      {},
      // Start by checking whether we have any of the good ol', documented, "tail.js official" tag attributes.
      [
        [/^(?:track\-)?tags?(?:$|\-)(.*)/],
        ...parse(flatMap2(cachedMappings, ([, value]) => value, 1)),
      ],
    ];

  (cachedTagMapper = (el: Element, tags: TagCollection) =>
    matchAttributeNames(el, cache, tags))(el, tags);
};

const cssPropertyWithBase = (el: Element, name: string) =>
  join2(
    concat(
      cssProperty(el, trackerPropertyName(name, T)),
      cssProperty(el, trackerPropertyName("base-" + name, T))
    ),
    " "
  );

// We cannot cache as broadly for CSS based rules, so we cache per selector instead.
const parsedCssRules: {
  [rule: string]: CacheMatchRules;
} = {};

const parseCssMappingRules = (
  el: Element,
  tags: TagCollection,
  rulesString = cssPropertyWithBase(el, "attributes")
) => {
  rulesString &&
    matchAttributeNames(
      el,
      (parsedCssRules[rulesString] ??= [
        {},
        matches(
          rulesString,
          /(?:(\S+)\:\s*)?(?:\((\S+)\)|([^\s,:]+))\s*(?!\S*\:)/g,
          (_, prefix, rule1, rule2) =>
            [parseRegex(rule1 || rule2), , prefix] as const
        ),
      ]),
      tags
    );
  collectTags(cssPropertyWithBase(el, "tags"), undefined, tags);
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
        isFunction(inherit) ? inherit : undefined
      )
    : join2(
        concat(
          attr(el, trackerPropertyName(name)),
          cssProperty(el, trackerPropertyName(name, T))
        ),
        " "
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
    "" || (propertyValue == nil ? propertyValue : parseBoolean(propertyValue));

export type ParsedTags = { tags?: Tag[] };

export const parseTags = (
  sourceEl: Element | Nullish,
  stoppingCriterion?: (el: Element, distance: number) => boolean,
  elementTagData?: (el: Element) => ParsableTags,
  tags?: TagCollection
): ParsedTags =>
  !sourceEl
    ? {}
    : ((tags ??= new Map()),
      parseCssMappingRules(sourceEl, tags),
      forAncestorsOrSelf(
        sourceEl,
        (el) => {
          parseTagAttributes(el, tags!);
          collectTags(elementTagData?.(el), undefined, tags!);
        },
        stoppingCriterion
      ),
      tags.size ? { tags: [...tags.values()] } : {});

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
