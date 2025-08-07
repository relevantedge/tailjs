import {
  BoundaryDataTag,
  ComponentTrackingBehavior,
  ExtendedTrackingBoundaryData,
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
  flatMap,
  forEach,
  get,
  isFunction,
  isIterable,
  isPlainObject,
  isRegEx,
  isString,
  join,
  matches,
  nil,
  parseBoolean,
  parseJson,
  parseRegex,
  replace,
  set,
  sort,
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

export const getBoundaryData = (
  el: any
): TrackingBoundaryData<true> | undefined => {
  if (el == null) {
    return undefined;
  }

  let data = boundaryData.get(el)?.merged;
  if (
    !data &&
    (el as HTMLElement).getAttribute &&
    (data = normalizeTrackingData(
      parseJson((el as HTMLElement).getAttribute("data-tailjs"), true)
    ))
  ) {
    boundaryData.set(el, {
      merged: data!,
      layers: new Map([[null, data!]]),
    });
  }
  return data;
};

export const updateBoundaryData = (
  el: any,
  data:
    | ExtendedTrackingBoundaryData
    | { clear: boolean }
    | Nullish
    | ((
        current: TrackingBoundaryData<true> | undefined
      ) => TrackingBoundaryData | Nullish),
  layer: any = null,
  debug = false
): ExtendedTrackingBoundaryData<true> | undefined => {
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
  layer ??= data?.layer;

  const normalized = normalizeTrackingData(data);

  if (current) {
    if (trySet(current.layers, layer, normalized ?? undefined)) {
      if (!current.layers.size) {
        boundaryData.delete(el);
        current = undefined;
      } else {
        current.merged = appendTrackingData(
          undefined,
          sort(current.layers.values(), (layer) => layer.layerPriority ?? 0)
        )!;
      }
    }
  } else if (normalized) {
    boundaryData.set(
      el,
      (current = {
        merged: normalized,
        layers: new Map([[layer, normalized]]),
      })
    );
  }

  flushPropertyCache();
  return current?.merged;
};

export const trackerPropertyName = (name: string, css = F) =>
  (css ? "--track-" : "data-track-") + name;

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
let trackerPropertyCache = new WeakMap<
  any,
  [direct: Map<string, { value: any }>, inherit: Map<string, { value: any }>]
>();
setInterval(() => flushPropertyCache, 500); // Flush cache.

const flushPropertyCache = () => (trackerPropertyCache = new WeakMap());

let propertyValue: string | Nullish;
export const trackerFlag = (
  el: Element,
  name: string,
  inherit:
    | boolean
    | ((el: NodeWithParentElement, distance: number) => boolean) = F,
  boundaryData?: (
    data: TrackingBoundaryData & { track?: ComponentTrackingBehavior }
  ) => boolean | Nullish
): boolean | Nullish =>
  (propertyValue = trackerProperty(el, name, inherit, boundaryData as any)) ===
    "" || (propertyValue == nil ? undefined : parseBoolean(propertyValue));

export const trackerProperty = <T = string>(
  el: Element,
  name: string,
  inherit:
    | boolean
    | ((el: NodeWithParentElement, distance: number) => boolean) = F,
  boundaryData?: (el: TrackingBoundaryData) => T | Nullish
): string | T | Nullish => {
  if (!el) {
    return undefined;
  }
  let cached = trackerPropertyCache.get(el)?.[+inherit].get(name);

  if (cached) {
    return cached.value;
  }

  return set(
    get(trackerPropertyCache, el, () => [new Map(), new Map()])[+inherit],
    name,
    (cached = {
      value:
        boundaryData &&
        (currentBoundaryData = getBoundaryData(el)) &&
        (boundaryDataValue = boundaryData(currentBoundaryData)) != null
          ? boundaryDataValue
          : (inherit
              ? forAncestorsOrSelf(
                  el,
                  (el, r) => r(trackerProperty(el, name, F, boundaryData)),
                  isFunction(inherit) ? inherit : undefined
                )
              : attr(el, trackerPropertyName(name)) ||
                cssProperty(el, trackerPropertyName(name, T))) || undefined,
    })
  ).value;
};

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
