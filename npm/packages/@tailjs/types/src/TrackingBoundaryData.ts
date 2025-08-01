import {
  assign,
  concat,
  filter,
  flatMap,
  forEach,
  map,
  replace,
  skip,
  some,
  update,
  type AnyRecordType,
  type NotIterable,
  type Nullish,
} from "@tailjs/util";

import {
  getExternalReferenceKey,
  type CartAction,
  type CartEventData,
  type ConfiguredComponent,
  type Content,
  type Tag,
  type View,
  type ViewEvent,
} from ".";

/**
 * A type or an array of the type.
 *
 * The Require parameter can be used by types where another parameter decides whether a property must be an array or not.
 */
type MaybeArray<T, Require = false> = (Require extends true ? never : T) | T[];

const isArray = Array.isArray;

export interface TrackingBoundaryData<Normalized extends boolean = false> {
  /**
   * The component definition(s) associated with the boundary element.
   *
   * * HTML attribute: `track-component`.
   * CSS: `--track-component`.
   * Attribute value: JSON representation of the {@link ConfiguredComponent} or the relevant properties as `track-component-[field]`
   * (e.g. `track-component-id`).
   */
  component?: MaybeArray<ConfiguredComponent, Normalized>;

  /**
   * The content definition(s) associated with the boundary element.
   *
   * HTML attribute: `track-content`.
   * CSS: `--track-content`.
   * Attribute value: JSON representation of the {@link Content} or the relevant properties as `track-content-[field]`
   * (e.g. `track-content-id`).
   *
   */
  content?: MaybeArray<Content, Normalized>;

  /**
   * The name of the content area in layout associated with the boundary element.
   *
   * A content area is used to indicate where activated components are used.
   *
   * HTML attribute: `track-area`
   * CSS: `--track-area`
   */
  area?: string;

  /**
   *  These tags will be added to the components and content in user activations with the boundary element or any of its descendants.
   *
   * HTML attribute: `track-tags`
   * CSS: `--track-tags`
   * Value: JSON or a string (e.g. `rendering:component:theme=dark,campaign:promo,audience=investors+8,audience=consumers+1`).
   */
  tags?: (Normalized extends true ? never : BoundaryTag[]) | EventSpecificTags;

  /**
   * The element will include cart data when activated.
   *
   * HTML attribute: `track-cart`.
   * CSS: `--track-cart`.
   * Attribute value: JSON representation of the {@link CartAction} and {@link CartEventData} or the relevant properties as `track-cart-[field]`
   * (e.g. `track-cart-action`).
   *
   */
  cart?: CartAction | CartEventData;

  tracking?: TrackingBehavior;
}

export type BoundaryTag = Tag & {
  /** The tag value will replace all existing tags with the same name. */
  replace?: boolean;
  /** Remove existing tag with the same value (or all tags with the same name if {@link replace}) */
  remove?: boolean;
};

export interface EventSpecificTags {
  all?: Tag[];
  events?: { [eventType in string]?: BoundaryTag[] };
}

export interface TrackingBehavior {
  /**
   * Disable tracking for this element and elements below it.
   *
   * HTML attribute: `track-disable`. \
   * CSS: `--track-disable: 0/no/false/1/yes/true`.
   */
  disable?: boolean;

  /**
   * Track the coordinates of the visible region occupied by the component or content.
   *
   * Inherited by child components (also if specified on non-component DOM element).
   *
   * HTML attribute: `track-region`. \
   * CSS: `--track-region: 0/no/false/1/yes/true`.
   *
   * @default false
   */
  region?: boolean;

  /**
   * Track clicks. Note that clicks are always tracked if they cause navigation.
   *
   * Inherited by child components (also if specified on non-component DOM element).
   *
   * HTML attribute: `track-clicks`.
   * CSS: `--track-clicks: 0/no/false/1/yes/true`.
   *
   * @default true unless in a `<nav>` tag
   */
  clicks?: boolean;

  /**
   * Track impressions, that is, when the component becomes visible in the user's browser for the first time.
   * This goes well with {@link region}.
   *
   * Not inherited by child components.
   *
   * HTML attribute: `track-impressions`.
   * CSS: `--track-impressions: 0/no/false/1/yes/true`.
   *
   * @default false
   */
  impressions?: boolean;
}

const TRACKING_DATA_KEYS: { [P in keyof ExtendedTrackingBoundaryData]: true } =
  {
    area: true,
    cart: true,
    component: true,
    content: true,
    tags: true,
    tracking: true,
    view: true,
  };

export const clearTrackingDataExtensions = (
  data: ExtendedTrackingBoundaryData<any>
): ExtendedTrackingBoundaryData<{}> => {
  let cleaned = data;
  for (const p in data) {
    if (!TRACKING_DATA_KEYS[p]) {
      cleaned === data && (cleaned = { ...data });
      delete cleaned[p];
    }
  }
  return cleaned;
};

const hasExtensionProperties = (data: any) => {
  if (typeof data !== "object") {
    return false;
  }
  for (const p in data) {
    if (!TRACKING_DATA_KEYS[p]) {
      return true;
    }
  }
  return false;
};

export const isEmptyTrackingData = (
  data: ExtendedTrackingBoundaryData | Nullish,
  ignoreExtensions = false
) =>
  !data ||
  ((!data.component || (data.component as any)?.length === 0) &&
    (!data.content || (data.content as any)?.length === 0) &&
    data.area == null &&
    data.tags == null &&
    data.cart == null &&
    data.tracking == null &&
    data.view == null &&
    (ignoreExtensions || hasExtensionProperties(data)));

export type TrackingDataExtensionType = NotIterable &
  AnyRecordType & {
    [P in keyof TrackingBoundaryData | "view"]?: never;
  };

export type ExtendedTrackingBoundaryData<
  StateExtensions extends TrackingDataExtensionType = {},
  Normalized extends boolean = false
> = TrackingBoundaryData<Normalized> & {
  /** Causes the current view to end, and a new {@link ViewEvent} to be sent. */
  view?: View | { addTags: TrackingBoundaryTagUpdate };
  /**
    Whether to reset the boundary data for the targeted element or merge it with the current (the default).

    @default false
  */
  reset?: boolean;
} & Omit<StateExtensions, keyof TrackingBoundaryData | "view">;

export type UpdateStateOptions<
  Extensions extends TrackingDataExtensionType = {},
  Normalized extends boolean = false
> = {
  uniqueIds?: boolean;
  mergeExtensions?: (
    target: ExtendedTrackingBoundaryData<Extensions, Normalized>,
    update: ExtendedTrackingBoundaryData<Extensions, Normalized>
  ) => ExtendedTrackingBoundaryData<Extensions>;
  mutate?: boolean;
  normalize?: Normalized;
};

export type TrackingBoundaryTagUpdate =
  | BoundaryTag[]
  | ((current: Tag[] | undefined) => Tag[])
  | Nullish
  | false
  | TagValueMap;

export type TagValueMap = Record<
  string,
  string | Nullish | MaybeArray<Omit<BoundaryTag, "tag">>
>;

const mergeArrays = <T, Normalize extends boolean = false>(
  value1: T | T[] | undefined,
  value2: T | T[] | undefined,
  uniqueKey?: false | ((value: T) => any),
  normalize?: Normalize,
  mutate: boolean = false
): (Normalize extends true ? never : T) | T[] | undefined => {
  if (value1 == null) {
    if (value2 == null) {
      return undefined;
    }
    return normalize && !isArray(value2)
      ? [value2]
      : distinct(value2 as any, uniqueKey, false);
  }
  if (value2 == null) {
    return normalize && !isArray(value1)
      ? [value1]
      : distinct(value1 as any, uniqueKey, mutate);
  }
  let merged: T[] = [];
  if (isArray(value1)) {
    merged.push(...value1);
  } else {
    merged.push(value1 as T);
  }

  if (isArray(value2)) {
    merged.push(...value2);
  } else {
    merged.push(value2 as T);
  }

  if (uniqueKey) {
    merged = distinct(merged, uniqueKey, mutate);
  }
  if (!normalize && merged.length === 1) {
    return merged[0] as any;
  }

  return merged;
};

export const isEmptyTagCollection = (tags: TrackingBoundaryData["tags"]) =>
  !tags ||
  (isArray(tags)
    ? !tags.length
    : !tags.all?.length &&
      (!tags.events ||
        !Object.values(tags.events).some((tags) => tags?.length)));

const normalizeTags = (
  tags: TrackingBoundaryData["tags"]
): EventSpecificTags | undefined => (isArray(tags) ? { all: tags } : tags);

const cloneEventTypes = (
  types: EventSpecificTags["events"]
): EventSpecificTags["events"] =>
  types
    ? Object.fromEntries(
        Object.entries(types).map((entry) => [
          entry[0],
          entry[1] ? [...entry[1]] : undefined,
        ])
      )
    : undefined;

const tagKey = (tag: Tag) => `${tag.tag}:${tag.value ?? ""}`;

export const uniqueTags: {
  (tags: BoundaryTag[]): Tag[];
  (
    tags: BoundaryTag[] | undefined,
    update?: TrackingBoundaryTagUpdate,
    mutate?: boolean
  ): Tag[] | undefined;
} = (
  tags: BoundaryTag[] | undefined,
  tagUpdates?: TrackingBoundaryTagUpdate,
  mutate?: boolean
): Tag[] => {
  let allTags: BoundaryTag[] | undefined = tags;
  if (tagUpdates) {
    if (typeof tagUpdates === "function") {
      // Replace/custom merge.
      allTags = tagUpdates(tags ?? []);
    } else {
      if (!isArray(tagUpdates)) {
        // Merge updates.
        // Using new array to avoid unintended mutation of current tags array.
        (allTags = tags ? [...tags] : []).push(
          ...flatMap(tagUpdates, ([tag, value]) =>
            value == null
              ? { tag, remove: true }
              : typeof value === "string"
              ? { tag, value }
              : isArray(value)
              ? map(value, (value) => ({ tag, ...value }))
              : { tag, ...value }
          )
        );
      } else {
        allTags = [...(tags ?? []), ...tagUpdates];
      }
    }
  }

  let clearBoundaryAttributes = false;
  if (allTags?.length) {
    forEach(
      allTags,
      (tag, ix) =>
        (tag.replace || tag.value === undefined) &&
        ((clearBoundaryAttributes = true),
        (allTags = map(allTags, (other, jx) =>
          jx > ix
            ? other
            : tag === other
            ? tag.value === undefined
              ? skip
              : assign(tag, true, { replace: undefined })
            : other.tag === tag.tag
            ? skip
            : other
        )))
    );
    if (allTags?.length !== 1) {
      // Merge if there is more than one tag in the array.
      const uniqueTags = new Map<string, Tag>();
      forEach(allTags, (tag) => {
        update(uniqueTags, tagKey(tag), () =>
          tag.remove ? ((clearBoundaryAttributes = true), undefined) : tag
        );
      });

      allTags = [...uniqueTags.values()];
    }
  }

  // Remove boundary tag specific properties.
  if (clearBoundaryAttributes) {
    allTags = map(allTags, (tag) =>
      assign(tag, true, { replace: undefined, remove: undefined })
    );
  }

  if (tags && allTags && mutate) {
    tags.splice(0, tags.length, ...allTags);
    return tags;
  }
  return allTags as Tag[];
};

const updateTags = (
  current: TrackingBoundaryData["tags"],
  update: TrackingBoundaryData["tags"],
  mutate = false
): EventSpecificTags | undefined => {
  if (current === update) {
    return normalizeTags(current);
  }

  current = normalizeTags(current);
  update = normalizeTags(update);

  if (!current) {
    return update;
  }
  if (!update) {
    return current;
  }

  const all = uniqueTags(current.all, update.all, mutate);
  const merged: EventSpecificTags = all?.length ? { all } : {};
  if (current.events) {
    merged.events = mutate ? current.events : cloneEventTypes(current.events)!;

    if (update.events) {
      for (const type in update.events) {
        const typeTags = uniqueTags(
          current.events[type],
          update.events[type],
          mutate
        );
        if (typeTags) {
          merged.events[type] = typeTags;
        }
      }
    }
  } else if (update.events) {
    merged.events = update.events;
  }
  return merged;
};

export const normalizeTrackingData = <T extends TrackingBoundaryData | Nullish>(
  data: T
): T extends TrackingBoundaryData
  ? T & TrackingBoundaryData<true>
  : undefined => {
  if (!data) {
    return undefined!;
  }
  let normalized = data;
  if (data.component && !isArray(data.component)) {
    normalized = { ...data, component: [data.component] };
  }
  if (data.content && !isArray(data.content)) {
    (normalized === data ? (normalized = { ...data }) : normalized).content = [
      data.content,
    ];
  }

  const normalizedTags = normalizeTags(data.tags);
  if (normalizedTags) {
    (normalized === data ? (normalized = { ...data }) : normalized).tags =
      normalizedTags;
  }

  return normalized as any;
};

const maybeNormalize = <
  T extends TrackingBoundaryData | Nullish,
  Normalize extends boolean
>(
  data: T,
  normalize: Normalize = false as any
): T extends TrackingBoundaryData
  ? Normalize extends true
    ? T & TrackingBoundaryData<true>
    : T
  : undefined =>
  normalize ? normalizeTrackingData(data) : (data as any) ?? undefined;

export type TrackingDataUpdate<
  Extensions extends TrackingDataExtensionType = {}
> =
  | Nullish
  | void
  | ExtendedTrackingBoundaryData<Extensions, boolean>
  | TrackingDataUpdate<Extensions>[];

export const updateTrackingData = <
  Extensions extends TrackingDataExtensionType = {},
  Normalized extends boolean = false
>(
  current: ExtendedTrackingBoundaryData<Extensions, boolean> | Nullish | void,
  update: TrackingDataUpdate<Extensions>,
  {
    uniqueIds = true,
    mergeExtensions,
    mutate,
    normalize,
  }: UpdateStateOptions<Extensions, Normalized> = {}
): ExtendedTrackingBoundaryData<Extensions, Normalized> | undefined => {
  if (!update) {
    if (!current) {
      return undefined;
    }
    return maybeNormalize(current, normalize) as any;
  }

  if (isArray(update)) {
    for (const entry of update) {
      if (!entry) {
        continue;
      }
      current = updateTrackingData(current, entry);
    }
    return maybeNormalize(current as any, normalize) as any;
  }

  if (!current || current === update) {
    return maybeNormalize(update, normalize) as any;
  }

  let merged = current;
  if (update.component != null && current.component !== update.component) {
    !mutate && merged === current && (merged = { ...current });
    merged.component = mergeArrays(
      current.component,
      update.component,
      uniqueIds && ((item) => getExternalReferenceKey(item)),
      normalize,
      mutate
    );
  }
  if (update.content != null && current.content !== update.content) {
    !mutate && merged === current && (merged = { ...current });
    merged.content = mergeArrays(
      current.content,
      update.content,
      uniqueIds && ((item) => getExternalReferenceKey(item)),
      normalize,
      mutate
    );
  }
  if (update.area != current.area) {
    !mutate && merged === current && (merged = { ...current });
    merged.area = update.area;
  }
  if (update.tags != null && update.tags !== current.tags) {
    !mutate && merged === current && (merged = { ...current });
    merged.tags = updateTags(current.tags, update.tags, mutate);
  }

  if (update.cart != null && update.cart !== current.cart) {
    !mutate && merged === current && (merged = { ...current });
    merged.cart = update.cart;
  }

  if (update.tracking != null && update.tracking !== current.tracking) {
    !mutate && merged === current && (merged = { ...current });
    if (!current.tracking) {
      merged.tracking = update.tracking;
    } else {
      merged.tracking = mutate ? current.tracking : { ...current.tracking };
      for (const flag in update.tracking) {
        const value = update.tracking[flag];
        if (value != null) {
          merged.tracking[flag] = value;
        }
      }
    }
  }

  if (update.view != null && update.view !== current.view) {
    !mutate && merged === current && (merged = { ...current });
    merged.view = update.view;
  }

  if (mergeExtensions) {
    !mutate && merged === current && (merged = { ...current });
    merged = mergeExtensions(
      maybeNormalize(merged, normalize) as any,
      maybeNormalize(update, normalize) as any
    );
  }

  return maybeNormalize(merged, normalize) as any;
};

const distinct = <T extends any[] | Nullish>(
  value: T,
  uniqueKey:
    | false
    | ((value: T extends readonly any[] ? T[number] : never) => any)
    | undefined,
  mutate: boolean
): T => {
  if (!uniqueKey || !value || !isArray(value)) {
    return value;
  }
  if (value.length <= 1) {
    return value;
  }

  const seen = new Set();
  let filtered = value.filter((value) => {
    let key = uniqueKey(value);
    if (key && seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  if (filtered.length === value.length) {
    return value;
  }

  if (mutate) {
    value.length = 0;
    value.push(...filtered);
    return value;
  }

  return filtered as T;
};

export const getTagsForEventType = (
  tags: TrackingBoundaryData["tags"],
  eventType?: string | Nullish
) => {
  if (!tags || isArray(tags) || !eventType || !tags.events?.[eventType]) {
    return isArray(tags) ? tags : tags?.all;
  }

  const typeTags = tags.events[eventType];
  return tags.all ? [...tags.all, ...typeTags] : typeTags;
};
