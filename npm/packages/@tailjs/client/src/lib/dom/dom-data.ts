import {
  BoundaryDataTag,
  ComponentTrackingBehavior,
  appendTrackingData,
  collectTags,
  normalizeTrackingData,
  uniqueTags,
  type Tag,
  type TrackingBoundaryData,
} from "@tailjs/types";
import {
  F,
  T,
  concat,
  filter,
  flatMap,
  forEach,
  isFunction,
  isIterable,
  isPlainObject,
  isRegEx,
  isString,
  join,
  map,
  matches,
  nil,
  parseBoolean,
  parseJson,
  parseRegex,
  replace,
  skip,
  stop,
  testRegex,
  trySet,
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
import type { TagMappings } from "../..";

export const boundaryData = new WeakMap<
  any,
  {
    merged: TrackingBoundaryData<true>;
    layers: Map<any, TrackingBoundaryData<true>>;
  }
>();

export const getBoundaryData = (el: any): TrackingBoundaryData | undefined => {
  if (el == null) {
    return undefined;
  }

  let data = boundaryData.get(el)?.merged;
  if (
    !data &&
    (el as HTMLElement).getAttribute &&
    (data = parseJson((el as HTMLElement).getAttribute("tailjs")))
  ) {
    data = normalizeTrackingData(data as any);
    boundaryData.set(el, {
      merged: data!,
      layers: new Map([[null, data!]]),
    });
  }
  return data;
};

export const clearBoundaryData = (el: any) => el && boundaryData.delete(el);

export const updateBoundaryData = (
  el: any,
  data:
    | TrackingBoundaryData
    | { clear: boolean }
    | Nullish
    | ((
        current: TrackingBoundaryData<true> | undefined
      ) => TrackingBoundaryData | Nullish),
  layer: any = null
): TrackingBoundaryData<true> | undefined => {
  if (el == null) {
    return;
  }

  let current = boundaryData.get(el);
  if (typeof data === "function") {
    data = data(current?.merged);
  } else if (data && "clear" in data) {
    boundaryData.delete(el);
    return undefined;
  }

  const normalized = normalizeTrackingData(data);
  if (current) {
    if (trySet(current.layers, layer, normalized ?? undefined)) {
      if (!current.layers.size) {
        boundaryData.delete(el);
        current = undefined;
      } else {
        current.merged = appendTrackingData(undefined, [
          current.layers.get(null),
          map(current.layers, ([key, layer]) => (key == null ? skip : layer)),
        ])!;
      }
    }
  } else if (normalized) {
    boundaryData.set(el, {
      merged: normalized,
      layers: new Map([[layer, normalized]]),
    });
  }

  return current?.merged;
};

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
  tags: undefined | BoundaryDataTag[],
  prefix?: string | boolean | Nullish,
  value?: string,
  eligible?: boolean
) => (
  cached?.[1] &&
    forEach(attributeNames(el), (name) => {
      return (cached[0][name] ??=
        ((eligible = F),
        isString(
          (prefix =
            // No cache. Let's loop through them then.
            forEach(
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
          (tags = collectTags(
            value,
            prefix ? { prefix: replace(prefix, /\-/g, ":") } : undefined,
            tags
          )),
        eligible));
    }),
  tags
);

// We cache the tracker configuration's rules for tag mappings.
let cachedTagMapper:
  | undefined
  | ((
      el: Element,
      tags: BoundaryDataTag[] | undefined
    ) => BoundaryDataTag[] | undefined);

let cachedMappings: TagMappings | undefined;
const parseTagAttributes = (
  el: Element,
  tags: BoundaryDataTag[] | undefined
) => {
  if (cachedMappings === (cachedMappings = trackerConfig.tags)) {
    return cachedTagMapper!(el, tags);
  }

  const parse = (rule: TagMappings[string]): MatchAttributeRule[] =>
      !rule
        ? []
        : isRegEx(rule)
        ? [[rule]]
        : isIterable(rule)
        ? flatMap(rule, parse, 1)
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
        ...parse(flatMap(cachedMappings, ([, value]) => value, 1)),
      ],
    ];

  return (cachedTagMapper = (
    el: Element,
    tags: BoundaryDataTag[] | undefined
  ) => matchAttributeNames(el, cache, tags))(el, tags);
};

const cssPropertyWithBase = (el: Element, name: string) =>
  join(
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
  tags: undefined | BoundaryDataTag[],
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
  return (tags = collectTags(cssPropertyWithBase(el, "tags"), undefined, tags));
};

let currentBoundaryData: TrackingBoundaryData | Nullish;
let boundaryDataValue: any;
export const trackerProperty = (
  el: Element,
  name: string,
  inherit:
    | boolean
    | ((el: NodeWithParentElement, distance: number) => boolean) = F,
  boundaryData?: (el: TrackingBoundaryData) => string | Nullish
): string | null =>
  boundaryData &&
  (currentBoundaryData = getBoundaryData(el)) &&
  (boundaryDataValue = boundaryData(currentBoundaryData)) != null
    ? boundaryDataValue
    : (inherit
        ? forAncestorsOrSelf(
            el,
            (el, r) => r(trackerProperty(el, name, F)),
            isFunction(inherit) ? inherit : undefined
          )
        : join(
            concat(
              attr(el, trackerPropertyName(name)),
              cssProperty(el, trackerPropertyName(name, T))
            ),
            " "
          )) ?? nil;

let propertyValue: string | Nullish;
export const trackerFlag = (
  el: Element,
  name: string,
  inherit:
    | boolean
    | ((el: NodeWithParentElement, distance: number) => boolean) = F,
  boundaryData?: (
    data: TrackingBoundaryData & { tracking?: ComponentTrackingBehavior }
  ) => boolean | Nullish
) =>
  (propertyValue = trackerProperty(el, name, inherit, boundaryData as any)) ===
    "" || (propertyValue == nil ? propertyValue : parseBoolean(propertyValue));

export type ParsedTags = { tags?: Tag[] };

export const getBoundaryTags = (
  sourceEl: Element | Nullish,
  eventType?: string | Nullish,
  tags?: BoundaryDataTag[]
): ParsedTags => {
  if (sourceEl) {
    const parentStack: Element[] = [];
    // Initialize element stack, so we can process it top/down.
    // This is required for tags from deeper levels to override values.
    forAncestorsOrSelf(sourceEl, (el) => parentStack.unshift(el));
    tags = parseCssMappingRules(sourceEl, tags);
    forEach(parentStack, (el) => {
      tags = collectTags(
        getBoundaryData(el)?.tags,
        undefined,
        (tags = parseTagAttributes(el, tags!))
      );
    });

    if (tags?.length) {
      return { tags: uniqueTags(tags, eventType) };
    }
  }
  return {};
};

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
