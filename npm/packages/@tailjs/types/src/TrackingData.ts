import { NotIterable, Nullish, AnyRecordType } from "@tailjs/util";
import {
  CartAction,
  CartEventData,
  ConfiguredComponent,
  Content,
  Tag,
  View,
} from ".";

type MaybeArray<T, Require> = (Require extends true ? never : T) | T[];

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
  tags?: Tag[];

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

export const isEmptyTrackingData = (data: TrackingBoundaryData | Nullish) =>
  !data ||
  ((!data.component || (data.component as any)?.length === 0) &&
    (!data.content || (data.content as any)?.length === 0) &&
    data.area == null &&
    (!data.tags || (data.tags as any)?.length === 0) &&
    data.cart == null &&
    data.tracking == null);

export type TrackingDataExtensionType = NotIterable &
  AnyRecordType & {
    [P in keyof TrackingBoundaryData | "view"]?: never;
  };

export type ExtendedTrackingBoundaryData<
  StateExtensions extends TrackingDataExtensionType = {},
  Normalized extends boolean = false
> = TrackingBoundaryData<Normalized> & { view?: View } & Omit<
    StateExtensions,
    keyof TrackingBoundaryData | "view"
  >;

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

export const normalizeTrackingData = <T extends TrackingBoundaryData | Nullish>(
  data: T
): T extends TrackingBoundaryData
  ? T & TrackingBoundaryData<true>
  : undefined => {
  if (!data) {
    return data ?? (undefined as any);
  }
  let normalized = data;
  if (data.component && !Array.isArray(data.component)) {
    normalized = { ...data, component: [data.component] };
  }
  if (data.content && !Array.isArray(data.content)) {
    normalized === data && (normalized = { ...data });
    normalized.content = [data.content];
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

export const updateTrackingData = <
  Extensions extends TrackingDataExtensionType = {},
  Normalized extends boolean = false
>(
  current: ExtendedTrackingBoundaryData<Extensions, boolean> | Nullish,
  update:
    | ExtendedTrackingBoundaryData<Extensions, boolean>
    | (ExtendedTrackingBoundaryData<Extensions, boolean> | Nullish)[]
    | Nullish,
  {
    uniqueIds = true,
    mergeExtensions,
    mutate,
    normalize,
  }: UpdateStateOptions<Extensions, Normalized> = {}
): ExtendedTrackingBoundaryData<Extensions, Normalized> | undefined => {
  if (Array.isArray(update)) {
    for (const entry of update) {
      if (!entry) {
        continue;
      }
      current = updateTrackingData(current, entry);
    }
    return maybeNormalize(current, normalize) as any;
  }

  if (!current || current === update) {
    return maybeNormalize(update, normalize) as any;
  }
  if (!update) {
    return maybeNormalize(current, normalize) as any;
  }

  let merged = current;
  if (update.component != null && current.component !== update.component) {
    !mutate && merged === current && (merged = { ...merged });
    merged.component = mergeArrays(
      current.component,
      update.component,
      uniqueIds && ((item) => item.id + item.dataSource?.id + item.name),
      normalize
    );
  }
  if (update.content != null && current.content !== update.content) {
    !mutate && merged === current && (merged = { ...merged });
    merged.content = mergeArrays(
      current.content,
      update.content,
      uniqueIds && ((item) => item.id + item.name),
      normalize
    );
  }
  if (update.area != current.area) {
    !mutate && merged === current && (merged = { ...merged });
    merged.area = update.area;
  }
  if (update.tags != null && update.tags !== current.tags) {
    !mutate && merged === current && (merged = { ...merged });
    merged.tags = mergeArrays(
      current.tags as any,
      update.tags,
      undefined,
      false
    );
  }
  if (update.cart != null && update.cart !== current.cart) {
    !mutate && merged === current && (merged = { ...merged });
    merged.cart = update.cart;
  }
  if (update.tracking != null && update.tracking !== current.tracking) {
    !mutate && merged === current && (merged = { ...merged });
    merged.tracking = { ...current.tracking };
    for (const flag in update.tracking) {
      const value = update.tracking[flag];
      if (value != null) {
        merged.tracking[flag] = value;
      }
    }
  }

  if (update.view != null && update.view !== current.view) {
    !mutate && merged === current && (merged = { ...merged });
    merged.view = update.view;
  }

  if (mergeExtensions) {
    !mutate && merged === current && (merged = { ...merged });
    merged = mergeExtensions(
      maybeNormalize(merged, normalize) as any,
      maybeNormalize(update, normalize) as any
    );
  }

  return isEmptyTrackingData(merged)
    ? undefined
    : (maybeNormalize(merged, normalize) as any);
};

const distinct = <T extends any[] | Nullish>(
  value: T,
  uniqueKey?:
    | false
    | ((value: T extends readonly any[] ? T[number] : never) => any)
): T => {
  if (!uniqueKey || !value) {
    return value;
  }
  if (value.length <= 1) {
    return value;
  }

  const seen = new Set();
  return value.filter((value) => {
    let key = uniqueKey(value);
    if (key && seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  }) as any;
};

const mergeArrays = <T, Normalize extends boolean = false>(
  value1: T | T[] | undefined,
  value2: T | T[] | undefined,
  uniqueKey?: false | ((value: T) => any),
  normalize?: Normalize
): (Normalize extends true ? never : T) | T[] | undefined => {
  if (value1 == null) {
    return normalize && !Array.isArray(value2)
      ? [value2]
      : distinct(value2 as any, uniqueKey);
  }
  if (value2 == null) {
    return normalize && !Array.isArray(value1)
      ? [value1]
      : distinct(value1 as any, uniqueKey);
  }
  let merged: T[] = [];
  if (Array.isArray(value1)) {
    merged.push(...value1);
  } else {
    merged.push(value1 as T);
  }

  if (Array.isArray(value2)) {
    merged.push(...value2);
  } else {
    merged.push(value2 as T);
  }

  if (uniqueKey) {
    merged = distinct(merged, uniqueKey);
  }
  if (!normalize && merged.length === 1) {
    return merged[0] as any;
  }

  return merged;
};
