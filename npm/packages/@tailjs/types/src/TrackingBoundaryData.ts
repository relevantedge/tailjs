import {
  getExternalReferenceKey,
  type CartAction,
  type CartEventData,
  type ConfiguredComponent,
  type Content,
  type DataClassification,
  type ExternalReference,
  type Tag,
  type Tagged,
  type View,
  type ViewEvent,
} from ".";

type Falsish = void | null | undefined | 0 | "" | false;

export type BoundaryDataTag = Omit<Tag, "eventType"> & {
  /** Only include the tag for this event type. */
  eventType?: string;
};

export type Extensible = {
  /** Custom data that can be used in logic. This is not tracked. */
  extensions?: { [extensionId: string]: any };
};

export type OptionalArray<
  T,
  Normalized extends boolean = false
> = Normalized extends true ? undefined | T[] : Falsish | (T | Falsish)[];

export type TrackingBoundaryData<Normalized extends boolean = false> =
  Extensible & {
    /**
     * The component definition(s) associated with the boundary element.
     *
     * * HTML attribute: `track-component`.
     * CSS: `--track-component`.
     * Attribute value: JSON representation of the {@link ConfiguredComponent} or the relevant properties as `track-component-[field]`
     * (e.g. `track-component-id`).
     */
    components?: OptionalArray<ConfiguredComponent, Normalized>;

    /**
     * The content definition(s) associated with the boundary element.
     *
     * HTML attribute: `track-content`.
     * CSS: `--track-content`.
     * Attribute value: JSON representation of the {@link Content} or the relevant properties as `track-content-[field]`
     * (e.g. `track-content-id`).
     *
     */
    content?: OptionalArray<Content, Normalized>;

    /**
     * The name of the content area in layout associated with the boundary element.
     *
     * A content area is used to indicate where activated components are used.
     * Do not use slashes like "parent/child". These slashes are inserted automatically based on element hierarchy when events tracked.
     *
     * HTML attribute: `track-area`
     * CSS: `--track-area`
     */
    area?: string;

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

    track?: TrackingBehavior;

    /**
     *  These tags will be added to the components and content in user activations with the boundary element or any of its descendants.
     *
     * HTML attribute: `track-tags`
     * CSS: `--track-tags`
     * Value: JSON or a string (e.g. `rendering:component:theme=dark,campaign:promo,audience=investors+8,audience=consumers+1`).
     */
    tags?: OptionalArray<BoundaryDataTag, Normalized>;

    /**
     * Can be used to avoid collisions between different logic updating the boundary data for an element.
     * Boundary data from all layers is merged.
     * The precedence of id and tag value clashes between named layers with the same priority is undefined.
     */
    layer?: string | symbol;
    /**
     * The priority of the values from this layer, higher is more important.
     *
     * @default 0
     */
    layerPriority?: number;
  };

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
   * Track impressions, that is, when the component's element becomes visible in the user's browser.
   * This goes well with {@link region}.
   *
   * Not inherited by child components.
   *
   * Not configurable via HTML/CSS.
   *
   * @default false
   */
  impressions?: ImpressionTrackingOptions;

  /**
   * Track forms.
   * @default true
   *
   * HTML attribute: `track-form`.
   * CSS: `--track-form: 0/no/false/1/yes/true`.
   */
  forms?: boolean;

  formFields?: {
    /**
     * Which form fields to track values for.
     *
     * HTML attribute: `track-form-field`.
     * CSS: `--track-form-field: 0/no/false/1/yes/true/none/checkbox-only/all`.
     *
     * @default "checkbox-only"
     */
    values?: FormFieldTrackingLevel;
    /**
     * Minimum consent classification before values are tracked.
     *
     * HTML attribute: `track-form-privacy`.
     * CSS: `--track-form-privacy: 0/no/false/1/yes/true/none/checkbox-only/all`.
     *
     * @default "anonymous" (always)
     */
    privacy?: DataClassification;
  };
}

export type FormFieldTrackingLevel = boolean | "checkbox-only";
export type ImpressionTrackingOptions =
  | boolean
  | {
      /** Do not count the impression before the component has been visible for at least this amount of milliseconds */
      delay?: number;
    };

export type UpdateFunction<T> = ((current: T | undefined) => T) | T;

export type BoundaryDataView = {
  /**
   * Sets the definition on the current view event.
   */
  definition?: Falsish | View;

  tags?: OptionalArray<Tag>;
  /**
   * Can be used to avoid collisions between different logic updating the view's tags (cf. {@link TrackingBoundaryData.layer}).
   * Note, layer does not have an effect on the definition since setting that triggers navigation.
   */
  layer?: string | symbol;
};

export type ExtendedTrackingBoundaryData<Normalized extends boolean = false> =
  TrackingBoundaryData<Normalized> & {
    /** Causes the current view to end, and a new {@link ViewEvent} to be sent, or tags to be added. */
    view?: Falsish | BoundaryDataView;
  };

export type UpdateStateOptions<Normalized extends boolean = false> = {
  mutate?: boolean;
  normalize?: Normalized;
};

const isEmpty = (value: any) => {
  if (value) {
    for (const p in value) {
      if (value[p] != null) {
        return false;
      }
    }
  }

  return true;
};

export const hasComponentOrContent = (
  data: Falsish | TrackingBoundaryData
): data is TrackingBoundaryData =>
  data ? !isEmpty(data.components) || !isEmpty(data.content) : false;

export const uniqueReferences = <T extends ExternalReference>(
  references: OptionalArray<T>
): T[] | undefined => cleanOptionalArray(references, referenceKey) as any;

const cleanOptionalArray = <T>(
  values: OptionalArray<T>,
  uniqueKey?: (item: T) => string,
  other?: OptionalArray<T>,
  filter?: (item: T) => undefined | T
): undefined | T[] => {
  if (!values) {
    if (!other) {
      return undefined;
    }
    values = other;
  } else if (other) {
    values = [...values, ...other];
  }

  let cleaned: T[] | undefined = values as any;
  if (values.length) {
    let value: any;
    for (let i = 0; i < values.length; i++) {
      if (
        !(value = values[i]) ||
        (filter && value != (value = filter(value)))
      ) {
        // Clone if need (`values` is immutable).
        cleaned = values.slice(0, i++) as any;
        if (value) {
          cleaned!.push(value);
        }
        for (; i < values.length; i++) {
          if ((value = values[i]) && (!filter || (value = filter(value)))) {
            cleaned!.push(value);
          }
        }
        break;
      }
    }

    if (!cleaned?.length) {
      cleaned = undefined;
    } else if (cleaned.length > 1 && uniqueKey) {
      const unique = new Map<string, T>();
      for (let item of cleaned) {
        unique.set(uniqueKey(item), item);
      }
      if (unique.size < cleaned.length) {
        cleaned = [...unique.values()];
      }
    }
  }
  return cleaned;
};

const hasValues = (map: any, depth = 0) => {
  if (map) {
    for (const p in map) {
      const value = map[p];
      if (
        value &&
        (!depth || typeof value !== "object" || hasValues(map[p], depth - 1))
      ) {
        return true;
      }
    }
  }
  return false;
};

const referenceKey: (reference: ExternalReference) => string =
  getExternalReferenceKey;

export const isEmptyTrackingData = (
  data: Falsish | ExtendedTrackingBoundaryData
) =>
  // `layer` ignored here, since layer + no other property is used to remove its data in the client.
  !data ||
  (isEmpty(data.components) &&
    isEmpty(data.content) &&
    !data.area &&
    !data.cart &&
    isEmpty(data.track) &&
    isEmpty(data.extensions) &&
    isEmpty(data.tags) &&
    (!data.view || (!data.view?.definition && isEmpty(data.view?.tags))));

type AppendData = Falsish | ExtendedTrackingBoundaryData | Iterable<AppendData>;

const isIterable = (value: any): value is Iterable<any> =>
  value ? typeof value !== "string" && Symbol.iterator in value : false;
export const appendTrackingData = (
  current: ExtendedTrackingBoundaryData<true> | Falsish,
  other: AppendData,
  keepEmpty = true
): ExtendedTrackingBoundaryData<true> | undefined => {
  if (current === other) {
    return normalizeTrackingData(current, keepEmpty);
  }

  if (!other) {
    return current || undefined;
  } else if (isIterable(other)) {
    let merged = current || undefined;
    for (const item of other as any) {
      if (item) {
        merged = appendTrackingData(merged, item, keepEmpty);
      }
    }
    return merged;
  } else if (!current) {
    return normalizeTrackingData(other, keepEmpty) || undefined;
  }

  return {
    components: cleanOptionalArray(
      current.components,
      referenceKey,
      other.components
    ),
    content: cleanOptionalArray(current.content, referenceKey, other.content),
    area: other.area || current.area,
    cart: other.cart || current.cart,
    track: current.track
      ? other.track
        ? { ...current.track, ...other.track }
        : current.track
      : other.track || undefined,
    layer: other.layer ?? current.layer,
    layerPriority: other.layerPriority ?? current.layerPriority,
    tags: cleanOptionalArray(current.tags, getTagKey, other.tags),
    view: current.view
      ? other.view
        ? {
            definition: other.view.definition || current.view.definition,
            tags:
              cleanOptionalArray(
                current.view.tags,
                getTagKey,
                other.view.tags
              ) ?? [],
          }
        : current.view
      : other.view,
    extensions: current.extensions
      ? other.extensions
        ? { ...current.extensions, ...other.extensions }
        : current.extensions
      : other.extensions,
  };
};

export const normalizeTrackingData = (
  data?: Falsish | ExtendedTrackingBoundaryData,
  keepEmpty = false
): undefined | ExtendedTrackingBoundaryData<true> => {
  if (!data || (!keepEmpty && isEmptyTrackingData(data))) {
    return undefined;
  }
  let updates: undefined | ExtendedTrackingBoundaryData<true> = undefined;
  let cleanedArray: any;
  if (
    (cleanedArray = cleanOptionalArray(data.components, referenceKey)) !==
    data.components
  ) {
    (updates ??= {}).components = cleanedArray;
  }
  if (
    (cleanedArray = cleanOptionalArray(data.content, referenceKey)) !==
    data.content
  ) {
    (updates ??= {}).content = cleanedArray;
  }
  if ((cleanedArray = cleanOptionalArray(data.tags, getTagKey)) !== data.tags) {
    (updates ??= {}).tags = cleanedArray;
  }
  let view = data.view;
  if (view !== undefined) {
    if (!view) {
      (updates ??= {}).view = undefined;
    } else {
      const definition = view.definition || undefined;
      const viewTags = cleanOptionalArray(view.tags, getTagKey);
      if (definition !== view.definition || viewTags !== view.tags) {
        (updates ??= {}).view = { definition, tags: viewTags };
      }
    }
  }

  return updates
    ? { ...(data as any), ...updates }
    : (data as ExtendedTrackingBoundaryData<true>);
};

export const getTagKey = (tag: BoundaryDataTag) =>
  `${tag.tag}\0${tag.value ?? ""}\0${tag.eventType || ""}`;

export const cleanBoundaryDataProperties = <T extends any>(
  data: T,
  eventType: string | null | undefined
): T => {
  if (data == null || typeof data !== "object") {
    return data;
  }

  let cloned = data;
  for (const p in data) {
    const value = data[p];
    if (value == null || typeof value !== "object") {
      continue;
    }
    let updatedValue =
      p === ("track" satisfies keyof TrackingBoundaryData)
        ? undefined
        : p === ("tags" satisfies keyof Tagged)
        ? uniqueTags(value as any, eventType)
        : cleanBoundaryDataProperties(value, eventType);
    if (value !== updatedValue) {
      if (cloned === data) {
        cloned = { ...data };
      }
      cloned[p] = updatedValue as any;
    }
  }
  return data;
};

export const uniqueTags = (
  tags: OptionalArray<BoundaryDataTag>,
  eventType: string | undefined | null | false = undefined,
  other?: OptionalArray<BoundaryDataTag>
): undefined | Tag[] =>
  tags
    ? (cleanOptionalArray(
        tags,
        getTagKey, // eventType is cleared before the key is resolved.
        other,
        eventType === false
          ? undefined
          : (tag) =>
              !tag.eventType
                ? tag
                : tag.eventType === eventType
                ? { ...tag, eventType: undefined }
                : undefined
      ) as Tag[])
    : undefined;
