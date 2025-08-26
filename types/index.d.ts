import * as _tailjs_util from '@tailjs/util';
import { Nullish, MaybeNullish, Falsish as Falsish$1, PickUnion, Json, MaybePromiseLike, StrictUnion, IfNever, ArrayOrSelf, AllKeys, TextStats, MaybeUndefined } from '@tailjs/util';

/**
 * An identifier that is globally unique. This does not need to be a "conventional" UUID like 853082a0-cc24-4185-aa30-9caacac02932'.
 * It is any string that is guaranteed to be globally unique, and may be longer than 128 bits.
 */
type Uuid = string;
type UuidV4 = string;
/**
 * An identifier that is locally unique to some scope.
 */
type LocalID = string;
/** Unix timestamp in milliseconds. */
type Timestamp = number;
/** Duration in milliseconds. */
type Duration = number;
type Integer = number;
type Float = number;
type Decimal = number;
type Percentage = number;

/**
 * Represents a position where the units are (CSS pixels)[#DevicePixelRatio].
 */
interface Position {
    x: Float;
    y: Float;
}
interface Poz {
    x: Float;
    y: Float;
}
/**
 * Represents a position where the units are percentages relative to an element or page.
 */
interface ScreenPosition {
    xpx?: Integer;
    ypx?: Integer;
    x: Percentage;
    y: Percentage;
    /**
     * The vertical position as a multiple of the page fold position (less than 1 means that the element was visible without scrolling).
     */
    pageFolds?: Float;
}

interface Rectangle extends Position, Size {
}

interface Size {
    width: Float;
    height: Float;
}

interface Viewport extends Rectangle {
    totalWidth: Float;
    totalHeight: Float;
}

/**
 * The component definition related to a user activation.
 */
interface ActivatedComponent extends Component {
    /**
     * The activated content in the component.
     */
    content?: ActivatedContent[];
    /**
     * The size and position of the component when it was activated relative to the document top (not viewport).
     */
    rect?: Rectangle;
    /**
     * An optional name of the area of the page (i.e. in the DOM) where the component is rendered. By convention this should the path of nested content areas separated by a slash.
     */
    area?: string;
}

/**
 * The content definition related to a user activation.
 */
interface ActivatedContent extends Content {
    /**
     * The current size and position of the element representing the content relative to the document top (not viewport).
     */
    rect?: Rectangle;
}

interface CartEventData extends OrderQuantity, Tagged {
    /**
     * The way the cart was modified.
     *
     * @default add
     */
    action?: CartAction;
}

interface CommerceData {
    /**
     * The unit price.
     */
    price?: Decimal;
    /**
     * The unit the item is sold by.
     */
    unit?: string;
    /**
     * The currency of the price. This field does not have a default value; if unspecified it must be assumed from context.
     */
    currency?: string;
    /**
     * The specific variant of the content if the item sold comes in different variations (e.g. red/green/purple).
     */
    variation?: ExternalReference;
    /**
     * The current number of units in stock.
     *
     * Use fixed integer values if you do not want to reveal the actual stock, e.g. (0 = none, 10 = few, 100 = many).
     */
    stock?: Float;
}

interface DataSource extends ExternalReference, Tagged {
}
interface Component extends ExternalReference, Personalizable, Tagged {
    /**
     * An additional type name that defines the component as represented in code. For example, the name of a (p)react component or ASP.NET partial.
     */
    typeName?: string;
    /**
     * Optional references to the content that was used to render the component.
     */
    dataSource?: DataSource;
    /**
     * An optional, unique identifier for the specific instance of the component with its parameters and current position in the rendered element tree.
     */
    instanceId?: string;
    /**
     * If the same component type is used multiple times on the same page this number indicates which one it is. (As defined in the page's markup, typically this amounts to left-to-right/top-to-bottom).
     */
    instanceNumber?: Integer;
    /**
     * A flag indicating whether the component was automatically inferred from context (e.g. by traversing the tree of React components).
     *
     * @default false
     */
    inferred?: boolean;
}

interface ConfiguredComponent extends Component {
    /**
     * Settings for how the component will be tracked.
     *
     * These settings are not tracked, that is, this property is stripped from the data sent to the server.
     */
    track?: ComponentTrackingBehavior;
}
interface ComponentTrackingBehavior extends TrackingBehavior {
    /**
     * Always include content and component, also if it is a parent component.
     * By default only the closest component will be included.
     *
     * This does not apply to impression tracking.
     *
     * Not inherited by child components.
     *
     * HTML attribute: `track-promote`.
     * CSS: `--track-promote: 0/no/false/1/yes/true`.
     *
     * @default false
     */
    promote?: boolean;
    /**
     * The component will only be tracked with the closest non-secondary component as if the latter had the {@link promote} flag.
     *
     * This does not apply to impression tracking.
     *
     * Not inherited by child components.
     *
     * HTML attribute: `track-secondary`. \
     * CSS: `--track-secondary: 0/no/false/1/yes/true`.
     *
     * @default false
     */
    secondary?: boolean;
}

/**
 * Represents a content item that can be rendered or modified via a {@link Component}
 *
 * If the content is personalized please add the criteria
 *
 */
interface Content extends ExternalReference, Tagged {
    commerce?: CommerceData;
}

declare const levels$1: {
    /** Data can be read and written from anywhere. */
    readonly public: "public";
    /** Data can be read from anywhere but can only be written in trusted context. */
    readonly "trusted-write": "trusted-write";
    /** Data is only available in trusted context. */
    readonly "trusted-only": "trusted-only";
};
/**
 * Defines restrictions on where data is available and when it can be modified.
 */
type DataAccess = {
    /**
     * The data cannot be changed once set.
     *
     * For schema definitions see {@link SchemaDataUsage} for inheritance rules.
     */
    readonly: boolean;
    /**
     * If data can be accessed outside trusted context.
     *
     * For schema definitions see {@link SchemaDataUsage} for inheritance rules.
     */
    visibility: DataVisibility;
};
type DataVisibility = (typeof levels$1)[keyof typeof levels$1];
declare const DataVisibility: _tailjs_util.EnumParser<{
    /** Data can be read and written from anywhere. */
    readonly public: "public";
    /** Data can be read from anywhere but can only be written in trusted context. */
    readonly "trusted-write": "trusted-write";
    /** Data is only available in trusted context. */
    readonly "trusted-only": "trusted-only";
}>;

/**
 * Defines to which extend a piece of information relates to a natural individual which is typically someone visiting your app or website.
 *
 * Tail.js requires all data that can be collected to be classified to prevent any data from being stored or otherwise used beyond
 * an individual's consent.
 *
 * Be aware that de default settings in the tail.js schema *do not* guarantee legal compliance, and you are responsible
 * for not using the collected data for other purposes than those intended.
 *
 */
declare const levels: {
    /**
     * A "consent" for this data classification means that no data will be stored for any reason.
     *
     * Likewise, if used in a schema all data with this classification will not be stored.
     */
    readonly never: "never";
    /**
     * The data cannot be linked to a specific individual after they leave the website or app, and their session ends.
     *
     * This does _not_ include seemingly anonymous data such as the hash of an IP address, since that may still be linked back
     * to an individual using "additional information". As an example, if you want to test if a specific person visited a website at a given time
     * and you know their IP address at that time by some other means, you can generate a hash with the same algorithm and see if it is
     * in the data.
     *
     * Tail.js will collect this kind of data in a way that does not use cookies or other information persisted in the individual's device. */
    readonly anonymous: "anonymous";
    /**
     * The data is unlikely to identify an individual by itself, but may link to a specific individual if combined with other data.
     *
     * Examples are IP addresses, detailed location data, and randomly generated device IDs persisted over time to track returning visitors.
     */
    readonly indirect: "indirect";
    /**
     * The data directly identifies a specific individual.
     *
     * Examples are names, email addresses, user names, customer IDs from a CRM system or order numbers that can be linked
     * to another system where the persons details are available.
     */
    readonly direct: "direct";
    /**
     * Not only does the data identify a specific individual but may also reveal sensitive information about the user
     * such as health data, financial matters, race, political and religious views, or union membership.
     *
     * tail.js's default schema does not have any data with this classification. If you intend to capture sensitive data in your events
     * you may consider pseudonomizing it by hashing it or obfuscating it by some other mechanism.
     * Whether the data will then classify as "indirect" or still be "sensitive" depends on context, but it will arguably then be
     * "less sensitive".
     */
    readonly sensitive: "sensitive";
};
type DataClassification = (typeof levels)[keyof typeof levels];
declare const DataClassification: _tailjs_util.EnumParser<{
    /**
     * A "consent" for this data classification means that no data will be stored for any reason.
     *
     * Likewise, if used in a schema all data with this classification will not be stored.
     */
    readonly never: "never";
    /**
     * The data cannot be linked to a specific individual after they leave the website or app, and their session ends.
     *
     * This does _not_ include seemingly anonymous data such as the hash of an IP address, since that may still be linked back
     * to an individual using "additional information". As an example, if you want to test if a specific person visited a website at a given time
     * and you know their IP address at that time by some other means, you can generate a hash with the same algorithm and see if it is
     * in the data.
     *
     * Tail.js will collect this kind of data in a way that does not use cookies or other information persisted in the individual's device. */
    readonly anonymous: "anonymous";
    /**
     * The data is unlikely to identify an individual by itself, but may link to a specific individual if combined with other data.
     *
     * Examples are IP addresses, detailed location data, and randomly generated device IDs persisted over time to track returning visitors.
     */
    readonly indirect: "indirect";
    /**
     * The data directly identifies a specific individual.
     *
     * Examples are names, email addresses, user names, customer IDs from a CRM system or order numbers that can be linked
     * to another system where the persons details are available.
     */
    readonly direct: "direct";
    /**
     * Not only does the data identify a specific individual but may also reveal sensitive information about the user
     * such as health data, financial matters, race, political and religious views, or union membership.
     *
     * tail.js's default schema does not have any data with this classification. If you intend to capture sensitive data in your events
     * you may consider pseudonomizing it by hashing it or obfuscating it by some other mechanism.
     * Whether the data will then classify as "indirect" or still be "sensitive" depends on context, but it will arguably then be
     * "less sensitive".
     */
    readonly sensitive: "sensitive";
}>;

type DataPurposeName = keyof DataPurposes | "necessary";
declare const DATA_PURPOSES_ALL: DataPurposes;
/**
 * Optional purposes that must be treated separately.
 */
interface OptionalPurposes {
    /**
     * Consider the security purpose different from "necessary".
     * @default false
     */
    security: boolean;
    /**
     * Consider the personalization purpose different from "functionality".
     * @default false
     */
    personalization: boolean;
}
interface PurposeTestOptions {
    intersect?: "some" | "all" | false;
    targetPurpose?: DataPurposeName;
    optionalPurposes?: OptionalPurposes | boolean;
}
declare const DataPurposes: {
    parse<T extends string | string[] | DataPurposes | DataUsage | Nullish, Names extends boolean = false, IncludeDefault extends boolean = true>(value: T, options?: {
        names?: Names;
        includeDefault?: boolean;
        validate?: boolean;
    }): T extends Nullish ? T : Names extends true ? ([IncludeDefault] extends true ? DataPurposeName : keyof DataPurposes)[] : DataPurposes;
    readonly all: DataPurposes;
    /**
     * Compares whether a consent is sufficient for a set of target purposes, or whether
     * a filter matches all the purposes in a target.
     *
     * @param target The target to validate the consent against.
     * @param test The set of allowed purposes in either a consent or filter.
     * @param options Options for how to test.
     *
     *  The default is "normal" consent validation which only requires the target to have one purpose with consent (or no required purposes).
     *
     */
    test(target: DataPurposes, test: DataPurposes, options?: PurposeTestOptions): boolean;
    names: DataPurposeName[];
    specificNames: (keyof DataPurposes)[];
};
/**
 * The purposes data can be used for.
 * Non-necessary data requires an individual's consent to be collected and used.
 *
 * Data categorized as "anonymous" will be stored regardless of consent since a consent only relates
 * to "personal data", and anonymous data is just "data".
 *
 * Whether the two purposes "personalization" and "security" are considered separate purposes
 * is configurable. The default is to consider "personalization" the same as "functionality", and
 * "security" the same as "necessary".
 */
interface DataPurposes {
    /**
     * Data stored for this purpose is used to gain insights on how individuals interact with a website or app optionally including
     * demographics and similar traits with the purpose of optimizing the website or app.
     *
     * DO NOT use this category if the data may be shared with third parties or otherwise used for targeted marketing outside the scope
     * of the website or app. Use {@link DataPurposeFlags.Targeting} instead.
     *
     * It may be okay if the data is only used for different website and apps that relate to the same product or service.
     * This would be the case if an individual is able to use an app and website interchangeably for the same service. Different areas of a brand may
     * also be distributed across multiple domain names.
     *
     */
    performance?: boolean;
    /**
     * Data stored for this purpose is used for settings that adjust the appearance of a website or app
     * according to an individual's preferences such as "dark mode" or localization of date and number formatting.
     *
     * Depending on your configuration, a functionality consent may also include personalization.
     * Personalization such as suggested articles and videos is per definition functionality,
     * but a special subcategory may be used to make the distinction between profile settings
     * and behavioral history depending on your requirements.
     *
     * DO NOT use this category if the data may be shared with third parties or otherwise used for targeted marketing outside the scope
     * of the website or app. Use {@link DataPurposeFlags.Marketing} instead.
     *
     * It may be okay if the data is only used for different website and apps that relate to the same product, brand or service, hence
     * the information is still "first party" with respect to the legal entity/brand to whom the consent is made.
     *
     * This would be the case if an individual is able to use an app and website interchangeably for the same service. Different areas of a brand may
     * also be distributed across multiple domain names.
     *
     */
    functionality?: boolean;
    /**
     * Data stored for this purpose may be similar to both functionality and performance data, however it may be shared with third parties
     * or otherwise used to perform marketing outside the scope of the specific website or app.
     *
     * When tagging data points in a schema it is good practice to also specify whether the data is related to
     * performance, functionality or both
     *
     * If the data is only used for different websites and apps that relate to the same product or service that belongs to your brand,
     * it might not be necessary to use this category.
     */
    marketing?: boolean;
    /**
     * Personalization is a special subcategory of functionality data that is
     * for things such as recommending articles and videos.
     * This purpose is per default synonymous with {@link DataPurposes.functionality}, but can be configured to be a separate purpose
     * that requires its own consent.
     */
    personalization?: boolean;
    /**
     * Data stored for this purpose is related to security such as authentication, fraud prevention, and other user protection.
     *
     * This purpose is per default synonymous with {@link DataPurposes.essential} but can be configured to be a separate purpose
     * that requires its own consent.
     */
    security?: boolean;
}

declare const formatDataUsage: (usage?: DataUsage) => string;
declare const validateConsent: (target: DataUsage, consent: DataUsage, options: PurposeTestOptions) => boolean;
/**
 * The combination of the classification and purposes it can be used for determines whether
 * data can be stored or used when compared to an individual's consent.
 */
interface DataUsage {
    /**
     * The maximum classification of data a user has consented to be collected and stored.
     *
     * Any property with a classification higher than this will be cleared (censored) before an object is stored.
     * If all properties gets censored, the object is not stored at all.
     *
     * Anonymous data does not require active consent, so data is stored regardless of its purposes
     * since it is not "personal data" but just "data".
     * This means you should not annotate all anonymous data as "necessary" in your schema, but rather
     * use the purpose(s) that would require consent had the data not been anonymous.
     *
     * In this way you can simply remove the `anonymous` annotation from a field or object if it turns
     * out it is not truly anonymous. After that the data can no longer be read for purposes without
     * user consent. However, tail.js does not currently support redacting/purging the data from storage
     * so this you need to do manually.
     *
     * For schema definitions see {@link SchemaDataUsage} for inheritance rules.
     *
     * @default anonymous
     *
     */
    classification: DataClassification;
    /**
     * The purposes the data may be used for.
     *
     * If a data point has multiple purposes, consent is only need for one of them
     * for the data to get stored. However, if some logic tries to read the data for a purpose without consent,
     * it is not returned, since it is only stored for other purposes.
     *
     * Purposes do not restrict anonymous data. If no purposes are explicitly specified it implies "necessary".
     *
     * For schema definitions see {@link SchemaDataUsage} for inheritance rules.
     */
    purposes: DataPurposes;
}
declare const DataUsage: {
    anonymous: UserConsent;
    clone: <T extends UserConsent | Nullish>(usage: T) => MaybeNullish<T, UserConsent>;
    equals: (usage1: DataUsage | Nullish, usage2: DataUsage | Nullish) => boolean | Nullish;
    applyOptional: <T extends UserConsent | Nullish>(usage: T, optional?: Partial<OptionalPurposes>) => T;
    serialize: (usage: UserConsent, optional?: Partial<OptionalPurposes>) => string | null;
    deserialize: (usageString: string | Nullish, defaultUsage?: UserConsent) => UserConsent;
};

/**
 * Represents a domain name, e.g. https://www.foo.co.uk
 */
interface Domain {
    scheme?: string;
    host?: string;
}

/** Basic information about an HTML element. */
interface ElementInfo {
    /** The tag name of the activated element.  */
    tagName?: string;
    className?: string;
    /** The textual content of the element that was clicked (e.g. the label on a button, or the alt text of an image) */
    text?: string;
    /** The target of the link, if any.  */
    href?: string;
    rect?: Rectangle;
}
/** Basic information about an HTML element that is associated with a component. */
interface ComponentElementInfo extends ElementInfo {
    component?: Component;
}

/** These properties are used to track the state of events as they get collected, and not stored. */
interface EventMetadata {
    /** Hint to the request handler that new sessions should not be started if all posted events are passive. */
    passive?: boolean;
    /** Hint that the event has been queued. */
    queued?: boolean;
    /** Hint to client code, that the event has been posted to the server. */
    posted?: boolean;
}
declare const clearMetadata: <T extends TrackedEvent | Nullish, ClientSide extends boolean>(event: T, client: ClientSide) => T & (ClientSide extends true ? {
    metadata?: {
        posted?: undefined;
    };
} : {
    metadata?: undefined;
});

/** The shape of the patch data for a {@link TrackedEvent} */
type EventPatch<T extends TrackedEvent = TrackedEvent> = Partial<Omit<T, "type">> & {
    type: `${T["type"]}_patch`;
} & Required<Pick<TrackedEvent, "patchTargetId">>;
declare const isEventPatch: (value: any) => value is EventPatch;

/**
 * Represent a reference to externally defined data.
 *
 * Have in mind that the reference does not need to point to an external system or database.
 * It can just as well be a named reference to a React component, the value of a MV test variable or event just some hard-coded value.
 *
 * The tailjs model generally prefers using external references rather than simple strings for most properties
 * since that gives you the option to collect structured data that integrates well in, say, BI scenarios.
 *
 * The tenet is that if you only use an URL from a web page, or the name of a campaign you will lose the ability to easily track these historically if/when they change.
 * Even when correctly referencing a immutable ID you might still want to include the name to make it possible to add labels in your analytics reporting without integrating additional data sources.
 * The names may then still be wrong after some time, but at least then you have the IDs data does not get lost, and you have a path for correcting it.
 *
 */
interface ExternalReference {
    /**
     * The ID as defined by some external source, e.g. CMS.
     *
     * The property is required but an empty string is permitted.
     * The library itself uses the empty string to indicate an "empty" root component if a page has content that is not wrapped in a component.
     */
    id: string;
    /**
     * Optionally, the version of the item in case the external source supports versioning.
     */
    version?: string;
    /**
     * Optionally, the language of the item in case the external source supports localization.
     */
    language?: string;
    /**
     * Optionally, the ID of the external system referenced.
     */
    source?: string;
    /**
     * Optionally, how the item is referenced in case the external source supports multiple kinds of references, e.g. "parent" or "pointer".
     */
    referenceType?: string;
    /**
     * Flag to indicate that this data comes from an external system that you do not control.
     */
    isExternal?: boolean;
    /**
     *   Optionally, the name of the item at the time an event was recorded.
     *   Ideally, this should be retrieved from the source system when doing reporting to avoid inconsistent data and wasting space.
     */
    name?: string;
    /**
     * Optionally, the type of item referenced. In CMS context this corresponds to "template".
     * Ideally, this should be retrieved from the source system when doing reporting to avoid inconsistent data and wasting space.
     */
    itemType?: string;
    /**
     *  Optionally, the path of the item at the time the event was recorded.
     *  Ideally, this should be retrieved from the source system when doing reporting to avoid inconsistent data and wasting space.
     */
    path?: string;
}
declare const getExternalReferenceKey: {
    (reference: ExternalReference): string;
    (reference: ExternalReference | undefined): string | undefined;
};
declare const externalReferencesEqual: (reference: ExternalReference | Nullish, other: ExternalReference | Nullish) => boolean | Nullish;

/**
 * A form field value in a {@link FormEvent}.
 */
interface FormField {
    id?: string;
    /** The name of the form field. */
    name: string;
    /** The label of the form field. */
    label?: string;
    /** The type of the input field. */
    type?: string;
    /**
     * If a user provided a value for the form field.
     *
     * For checkboxes and prefilled drop-downs this is only set if the user changed the value (for checkboxes that is clicked them).
     */
    filled?: boolean;
    /**
     * The number of times the field was changed after initially being filled.
     */
    corrections?: Integer;
    /**
     * How long the user was active in the field (field had focus on active tab).
     */
    activeTime?: Duration;
    /**
     * How long the user was in the field (including if the user left the tab and came back).
     */
    totalTime?: Duration;
    /**
     * The value of the form field. Be careful with this one.
     *
     * The default is only to track whether checkboxes are selected.
     * See {@link TrackingBehavior.forms} and {@link TrackingBehavior.formFields} for details.
     *
     */
    value?: string;
    /**
     * This field's number in the order the form was filled.
     * A field is "filled" the first time the user types something in it.
     *
     * If a checkbox or pre-filled drop down is left unchanged it will not get assigned a number.
     */
    fillOrder?: Integer;
    /**
     * The field was the last one to be filled before the form was either submitted or abandoned.
     */
    lastField?: boolean;
}

/**
 * @internal
 */
interface FunnelStage extends ExternalReference {
    /**
     * The step number in the funnel.
     *
     * Since this number is targeted towards marketers and other business it is 1-indexed (the first step has number 1, not 0 like in programming).
     */
    stepNumber: Integer;
}
/**
 * The definition of a marketing funnel.
 *
 * Should you wonder what that is, a funnel idealizes the theoretical customer journey toward the purchase of a good or service, signup or a similar significant conversion.
 *
 * @internal
 */
interface Funnel extends ExternalReference {
    /**
     * The steps in the funnel.
     */
    stage: FunnelStage[];
}

interface GeoEntity {
    name: string;
    geonames?: Integer;
    iso?: string;
    confidence?: Float;
}

/**
 * Represents an order for tracking purposes.
 *
 */
interface Order extends Tagged {
    /**
     * A reference that can be used both before the order is completed, and if the order ID shown to the user is different from how the order is stored in underlying systems.
     */
    internalId?: string;
    /**
     * The order ID as shown to the user.
     */
    orderId: string;
    /**
     * Optionally, all the items in the order at the time the order was made.
     */
    items?: OrderLine[];
    /**
     * The total discount given for this order including the sum of individual order line discounts
     */
    discount?: Decimal;
    /**
     * The delivery cost, if any, and it is not included as an order line.
     */
    delivery?: Decimal;
    /**
     * The VAT included in the total.
     *
     */
    vat?: Decimal;
    /**
     * The total of the order including VAT, delivery, discounts and any other costs added.
     *
     */
    total?: Decimal;
    /**
     * The payment method selected for the order.
     */
    paymentMethod?: string;
    /**
     * The currency used for the order.
     *
     * The order lines are assumed to be in this currency if not explicitly specified for each.
     * (It is not an error to have order lines with different currencies it is just a bit... unusual).
     */
    currency?: string;
}

interface OrderLine extends OrderQuantity, Tagged {
    /**
     * An optional identifier that makes it possible to reference this order line directly.
     */
    lineId?: string;
    /**
     * The VAT included in the total.
     */
    vat?: Decimal;
    /**
     * The total for this order line including VAT
     */
    total?: Decimal;
}

/**
 * Base information for the amount of an item added to an {@link Order} or cart that is shared between {@link CartUpdatedEvent} and {@link OrderLine}.
 */
interface OrderQuantity extends CommerceData {
    /**
     * The number of units.
     * @default 1
     */
    units?: Integer;
    /**
     * The item that relates to this quantity.
     * If not explicitly set it will get its value from the closest associated content in a {@link UserInteractionEvent} context.
     */
    item?: ExternalReference;
}

interface Personalizable {
    personalization?: Personalization[];
}

/**
 * A specific aspect changed for a page or component for personalization as part of a {@link PersonalizationVariant}.
 *
 */
interface PersonalizationSource extends ExternalReference, Tagged {
    /**
     * In case of a multi-variate test (or similar) that runs over multiple components and/or pages, this can be the ID of the specific variable that decided personalization for a specific component.
     */
    relatedVariable?: string;
    /**
     * The kind of personalization that relates to this item.
     */
    personalizationType?: string;
}
/**
 * A reference to the data/content item related to a variant in personalization.
 */
interface PersonalizationVariant extends ExternalReference, Tagged {
    /**
     * The aspects of the component or page the variant changed.
     * There can multiple sources, e.g. a variant may both change the size of a component and change the content at the same time.
     */
    sources?: PersonalizationSource[];
    /**
     * If the reference is the default variant.
     *
     * @default false
     */
    default?: boolean;
    /**
     * If the variant could have been picked.
     */
    eligible?: boolean;
    /**
     * If the variant was chosen.
     */
    selected?: boolean;
}
/**
 * The choices made by some logic to show different content to different users depending on some traits either to help them or to make them buy more.
 */
interface Personalization extends Tagged {
    /**
     * The source and definition for the personalization.
     * This could be a named rule set, a test definition or a specific configuration of an algorithm.
     *
     * If you are using multiple services/system for personalization you can add this to {@link ExternalReference.source}.
     *
     * If more than one component was changed by the same personalization logic they will share this source, but may have different variables.
     *
     * For example, the personalization in each component may correspond to different variables in a multivariate test.
     * In that case the components will share the {@link Personalization.definition} corresponding to the test, but have different {@link Personalization.variable}s.
     */
    definition?: ExternalReference;
    /**
     * The set of choices that were possible at the time given the user.
     * Even though implied, this should include the choice made so the data does not look inconsistent.
     *
     * To represent the default values for the sources that can be personalized, include the default variant and assign the default settings to it as sources.
     */
    variants?: PersonalizationVariant[];
}

declare const SCOPE_INFO_KEY = "@info";
declare const CONSENT_INFO_KEY = "@consent";
declare const SESSION_REFERENCE_KEY = "@session_reference";

/**
 * @abstract
 * @privacy anonymous, necessary, trusted-write
 */
interface ScopeInfo {
    id: string;
    firstSeen: Timestamp;
    lastSeen: Timestamp;
    views: number;
    isNew?: boolean;
    /** The user agent of the client (only included when debugging). */
    userAgent?: string;
}
/** @access trusted-write */
interface SessionInfo extends ScopeInfo {
    id: string;
    deviceId?: string;
    deviceSessionId?: string;
    userId?: string;
    previousSession?: Timestamp;
    hasUserAgent?: boolean;
    /** The session id anonymous. */
    anonymous?: boolean;
    /**
     * If the user upgraded their consent, this will be the original anonymous session ID.
     *
     * @access trusted-only
     */
    anonymousSessionId?: string;
    /** The total number of tabs opened during the session. */
    tabs?: number;
}
/** @access trusted-write */
interface DeviceInfo extends ScopeInfo {
    id: string;
    sessions: number;
}
interface ScopeVariables {
    session: {
        /** @privacy anonymous, necessary */
        [SCOPE_INFO_KEY]?: SessionInfo;
        /**
         * User consent is a dynamic variable that is resolved by the Tracker and cannot be set.
         *
         * @privacy anonymous, necessary
         * @access dynamic
         */
        [CONSENT_INFO_KEY]?: UserConsent;
        /**
         * @privacy anonymous, necessary
         * @access trusted-only
         */
        [SESSION_REFERENCE_KEY]?: string;
    };
    device: {
        /** @privacy indirect, necessary */
        [SCOPE_INFO_KEY]?: DeviceInfo;
    };
}

/**
 * Identifiers related to a user's session, login and device.
 * Based on the user's consent some of these fields may be unavailable.
 *
 * @privacy anonymous, necessary
 *
 */
interface Session {
    /**
     * If a non-anonymous session started as an anonymous session, this is the anonymous session ID.
     * Since an anonymous session is not necessarily unique to a device, processing logic may decide
     * whether and how to stitch the anonymous and non-anonymous session together.
     */
    anonymousSessionId?: Uuid;
    /**
     * The unique ID of the user's session. A new sessions starts after 30 minutes of inactivity (this is configurable, but 30 minutes is the default following GA standards).
     * Sessions are reset when an authenticated user logs out (triggered by the {@link SignOutEvent}).
     *
     * Aggressive measures are taken to make it literally impossible for third-party scripts to use it for fingerprinting, and virtually impossible for rogue browser extensions.
     * It is persisted in a way that follows best practices for this kind information (secure HTTP-only cookies), hence it can be expected to be as durable as possible for the user's browser and device.
     *
     * It is recommended to configure rolling encryption keys to make it cryptographically impossible to use this for fingerprinting.
     *
     */
    sessionId: Uuid;
    /**
     * The unique ID of the user's device. This ID does most likely not identify the device reliably over time, since it may be reset if the user purges tracking data, e.g. clears cookies or changes browser.
     *
     * Aggressive measures are taken to make it literally impossible for third-party scripts to use it for fingerprinting, and virtually impossible for rogue browser extensions.
     * It is persisted in a way that follows best practices for this kind information (secure HTTP-only cookies), hence it can be expected to be as durable as possible for the user's browser and device.
     *
     * It is recommended to configure rolling encryption keys to make it cryptographically impossible to use this for fingerprinting.
     */
    deviceId?: Uuid;
    /**
     * The unique ID of the user's device session ID. A device session starts when the user enters the site like a normal server session, but unlike
     * server sessions, device sessions stay active as long as the user has tabs related to the site open.
     * This means that device sessions survives when the user puts their computer to sleep, or leaves tabs open in the background on their phone.
     *
     * After the user has completely left the site, device sessions time out in the same way as server sessions.
     *
     * @privacy indirect, performance, functionality
     */
    deviceSessionId?: Uuid;
    /**
     * The current user owning the session.
     *
     * @privacy direct
     */
    userId?: string;
    /**
     * The user's consent choices. {@link DataClassification.Anonymous} means the session is cookie-less.
     *
     */
    consent?: UserConsent;
    /**
     *
     * The IP address of the device where the session is active.
     *
     * @privacy indirect, necessary
     */
    clientIp?: string;
    /**
     * Indicates that multiple clients are active in the same anonymous session.
     */
    collision?: boolean;
    /**
     * Whether the session is using anonymous tracking.
     */
    anonymous?: boolean;
    /**
     *
     * This value indicates that an old device session "woke up" with an old device session ID and took over a new one.
     * This may happen when background tabs are suspended.
     *
     * Post-processing can decide how to tie them together when the same tab participates in two sessions (which goes against the definition of a device session).
     *
     * @privacy indirect, performance, functionality
     */
    expiredDeviceSessionId?: string;
}

/**
 * Events implementing this interface indicate that they contain information that relates to the entire session and not just the page view where they happened.
 */
interface SessionEvent {
}

interface Tag {
    /** The name of the tag including namespace. */
    tag: string;
    /** The value of the tag. */
    value?: string;
    /**
     * How strongly the tags relates to the target (between 0 and 1).
     * @default 1
     */
    score?: Float;
}

/**
 * Types extending this interface allow custom values that are not explicitly defined in their schema.
 *
 * See {@link tags} for details.
 *
 */
interface Tagged {
    /**
     * Tags in tail.js are a flexible form of key/value pairs that can be used to categorize events, track component parameters
     * and add contextual information to content data organized in a taxonomy specific to your business domain.
     *
     * Examples of tags are `promotion, color=black`, `rendering:component:theme=dark`, `ad-campaign=43899`,
     *  `ext1:video:play` and `area=investors+9, area=consumers+2`
     *
     * As in the examples above, tags can optionally have a value indicated by an equals sign (`=`), and the labels can be organized in taxonomies with each rank/taxon separated by a colon (`:`).
     *
     * It is possible to specify "how much" a tag applies to something via a _tag score_.
     * A common use case is to get a straight-forward way categorize sessions based on the users interests. For example, if a user
     * mostly clicks on CTAs and reads content with tags like `audience=investors+8,audience=consumers+1` the score for the "investors" audience will ultimately
     * be higher than the score for "consumers".
     *
     * Tags are separated by comma (`,`).
     *
     * The following rules apply:
     * - There should not be quotes around tag values. If there are they will get interpreted as part of the value.
     * - Tag names will get "cleaned" while they are tracked, and all letters are converted to lowercase and other characters than numbers,  `.`, `-` and `_` are replaced with `_`.
     * - Tag values can be mostly anything, but you should keep them short and prefer referencing things by their external ID instead of their names.
     * - If you need the `,` literal as part of a tag value it can be escaped by adding a backslash in front of it (`\,`), however using commas or similar characters
     *   to store a list of values in the same tag is discouraged as each value should rather have its own tag.
     *
     * BAD: `selected=1\,2\,3`, `selected=1|2|3`
     * GOOD: `selected=1, selected=2, selected=3`
     *
     * BAD: `event=My social gathering in July,source=eventbrite`
     * GOOD: `event:eventbrite:id=8487912`
     *
     * BAD: `campaign:promo=true, utm_campaign:fb_aug4_2023`
     * GOOD: `campaign:promo, utm:campaign=fb_aug4_2023`
     *
     * Tags can either be added directly to content and component definitions when events are tracked,
     * or added to the HTML elements that contain the components and content.
     *
     * Tags are associated with HTML elements either via the `track-tags` attribute,
     * or the  `--track-tags` CSS variable in a selector that matches them, and these tags will be added to all
     * content and components they contain including nested HTML elements.
     *
     * Since stylesheets can easily be injected to a page via an external tag manager, this makes an easy way
     * to manage the (tail.js) tags externally if you do not have access to developer resources.
     *
     */
    tags?: Tag[];
}

type Falsish = void | null | undefined | 0 | "" | false;
type BoundaryDataTag = Omit<Tag, "eventType"> & {
    /** Only include the tag for this event type. */
    eventType?: string;
};
type Extensible = {
    /** Custom data that can be used in logic. This is not tracked. */
    extensions?: {
        [extensionId: string]: any;
    };
};
type OptionalArray<T, Normalized extends boolean = false> = Normalized extends true ? undefined | T[] : Falsish | (T | Falsish)[];
type TrackingBoundaryData<Normalized extends boolean = false> = Extensible & {
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
interface TrackingBehavior {
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
type FormFieldTrackingLevel = boolean | "checkbox-only";
type ImpressionTrackingOptions = boolean | {
    /** Do not count the impression before the component has been visible for at least this amount of milliseconds */
    delay?: number;
};
type UpdateFunction<T> = ((current: T | undefined) => T) | T;
type BoundaryDataView = {
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
type ExtendedTrackingBoundaryData<Normalized extends boolean = false> = TrackingBoundaryData<Normalized> & {
    /** Causes the current view to end, and a new {@link ViewEvent} to be sent, or tags to be added. */
    view?: Falsish | BoundaryDataView;
};
type UpdateStateOptions<Normalized extends boolean = false> = {
    mutate?: boolean;
    normalize?: Normalized;
};
declare const hasComponentOrContent: (data: Falsish | TrackingBoundaryData) => data is TrackingBoundaryData;
declare const uniqueReferences: <T extends ExternalReference>(references: OptionalArray<T>) => T[] | undefined;
declare const isEmptyTrackingData: (data: Falsish | ExtendedTrackingBoundaryData) => boolean;
type AppendData = Falsish | ExtendedTrackingBoundaryData | Iterable<AppendData>;
declare const appendTrackingData: (current: ExtendedTrackingBoundaryData<true> | Falsish, other: AppendData, keepEmpty?: boolean) => ExtendedTrackingBoundaryData<true> | undefined;
declare const normalizeTrackingData: (data?: Falsish | ExtendedTrackingBoundaryData, keepEmpty?: boolean) => undefined | ExtendedTrackingBoundaryData<true>;
declare const getTagKey: (tag: BoundaryDataTag) => string;
declare const cleanBoundaryDataProperties: <T extends unknown>(data: T, eventType: string | null | undefined) => T;
declare const uniqueTags: (tags: OptionalArray<BoundaryDataTag>, eventType?: string | undefined | null | false, other?: OptionalArray<BoundaryDataTag>) => undefined | Tag[];

interface TrackingSettings {
    /**
     * Always include in {@link UserInteractionEvent.components}, also if it is a parent component.
     * By default only the closest component will be included.
     *
     * This does not apply to impression tracking.
     *
     * Not inherited by child components.
     *
     * HTML attribute: `track-promote`.
     * CSS: `--track-promote: 1/yes/true`.
     *
     * @default false
     */
    promote?: boolean;
    /**
     * The component will only be tracked with the closest non-secondary component as if the latter had the {@link promote} flag.
     *
     * This does not apply to impression tracking.
     *
     * Not inherited by child components.
     *
     * HTML attribute: `track-secondary`. \
     * CSS: `--track-secondary: 1/yes/true`.
     *
     * @default false
     */
    secondary?: boolean;
    /**
     * Track the visible region occupied by the component or content.
     *
     * Inherited by child components (also if specified on non-component DOM element).
     *
     * HTML attribute: `track-region`. \
     * CSS: `--track-region: 1/yes/true`.
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
     * CSS: `--track-clicks: 1/yes/true`.
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
     * CSS: `--track-impressions: 1/yes/true`.
     *
     * @default false
     */
    impressions?: boolean;
}

interface UserConsent extends DataUsage {
    /** Where the consent comes from (typically Google Consent Mode v2 via a cookie consent screen). */
    source?: string;
}

/**
 * Events implementing this interface indicate that they contain information that applies to the user across all session (e.g. a user profile settings).
 */
interface UserScoped {
}

interface View extends Content, Personalizable {
    /**
     * The page was shown in preview/staging mode.
     */
    preview?: boolean;
}

interface ViewTimingData {
    /**
     * The time the user has been active in the view/tab. Interactive time is measured as the time where the user is actively scrolling, typing or similar.
     * Specifically defined as [transient activation](https://developer.mozilla.org/en-US/docs/Glossary/Transient_activation) with a timeout of 10 seconds.
     */
    activeTime?: Duration;
    /**
     * The time the view/tab has been visible.
     */
    visibleTime?: Duration;
    /**
     * The time elapsed since the view/tab was opened.
     */
    totalTime?: Duration;
    /**
     * The number of times the user toggled away from the view/tab and back.
     */
    activations?: Integer;
}

type VariableGetRequest<Scoped extends boolean = true> = ServerScoped<ReadOnlyVariableGetter & {
    /**
     * Callbacks polling for changes to this variable will not get notified when this flag is set.
     */
    passive?: boolean;
}, Scoped>;
type VariableSetRequest<Scoped extends boolean = true> = ServerScoped<VariableValueSetter, Scoped>;
interface PostRequest<Scoped extends boolean = true> {
    /** New events to add. */
    events?: TrackedEvent[];
    /** Results from variable operations. */
    variables?: {
        get?: readonly (VariableGetRequest<Scoped> | Nullish)[];
        set?: readonly (VariableSetRequest<Scoped> | Nullish)[];
    };
    /**
     * If tail.js is hosted in a multi-tenant setup you know what to do.
     * Otherwise, leave this blank.
     */
    apiKey?: string;
    /**
     * The request was send passively from the client.
     * Any response such as changed variables will be pushed to the client via a cookie.
     */
    beacon?: boolean;
    /**
     * A client-generated session ID.
     */
    deviceSessionId?: string;
    /**
     * A client-generated device ID. If specified, the server will not generate one.
     *
     * Useful for apps amongst other things.
     */
    deviceId?: string;
}

type VariableGetResponse<Scoped extends boolean = true> = ServerScoped<VariableGetResult & {
    /**
     * Callbacks polling for changes to this variable will not get notified when this flag is set.
     */
    passive?: boolean;
}, Scoped>;
type VariableSetResponse<Scoped extends boolean = true> = ServerScoped<VariableSetResult, Scoped>;
interface PostResponse<Scoped extends boolean = true> {
    /**
     * Results from variable operations.
     * The server may push variables to the client by including get results that the client has not requested.
     */
    variables?: {
        /** Results from get operations made via a {@link PostRequest} or variables the server wants to push. */
        get?: (ServerScoped<VariableResultPromiseResult<"get", VariableGetResult>, Scoped> | undefined)[];
        /** Result from set operations made via a {@link PostRequest}. */
        set?: (ServerScoped<VariableResultPromiseResult<"set", VariableSetResult>, Scoped> | undefined)[];
    };
    /** Events to be routed to an external client-side tracker. */
    clientEvents?: TrackedEvent[];
}
declare const isPostResponse: (response: any) => response is PostResponse;

declare const CORE_SCHEMA_NS = "urn:tailjs:core";
declare const CORE_EVENT_TYPE = "urn:tailjs:core#TrackedEvent";
declare const CORE_EVENT_DISCRIMINATOR = "type";
declare const EVENT_TYPE_PATCH_POSTFIX = "_patch";
interface SchemaDefinition extends SchemaDefinitionEntity, VersionedSchemaEntity {
    name?: string;
    /**
     * The namespace be unique for each schema and be in the form a valid URI (either URL or URN).
     * If unspecified, the schema name will converted into a URN and used as namespace.
     */
    namespace: string;
    /**
     * The types exposed by the schema.
     */
    types?: {
        [TypeName in string]: SchemaTypeDefinition;
    };
    variables?: {
        [Scope in VariableServerScope | (string & {})]?: {
            [Key in string]?: SchemaVariableDefinition;
        };
    };
    /**
     * If a local type is used in place of the tail.js event type in an auto-generated schema,
     * it's type name can be specified here. The effect is that the local type's definition is removed,
     * and types inheriting from it will have their reference replaced with the actual tail.js event type.
     */
    localTypeMappings?: {
        [P in SchemaTypeSystemRole]: string;
    };
}

type SchemaArrayTypeDefinition = {
    item: SchemaPropertyTypeDefinition & {
        required?: boolean;
    };
};

declare const SCHEMA_DATA_USAGE_ANONYMOUS: SchemaDataUsage;
/**
 * The most restrictive setting for all the attributes.
 */
declare const SCHEMA_DATA_USAGE_MAX: SchemaDataUsage;
/**
 * The data usage for this type or property.
 * If only partially specified, missing attributes will be inherited in this way:
 * - A type declared directly in a schema inherits from types it extends in the order they are specified.
 *   That is, if the type does not have an attribute, the attribute will be inherited from the first extended type that has a value.
 * - A property inherits from its _originally_ declaring type. That means if a type overrides a property, the
 *   property will inherit the usage from the extended type, and not the current type.
 * - An embedded type inherits from its declaring property (the one that embeds it).
 *
 * If attributes are still missing they will be set from the schema that declares the type. Again, mind that
 * for properties this schema will be the schema of the _declaring_ type in case a type overrides a property from
 * another schema.
 */
interface SchemaDataUsage extends DataUsage, DataAccess {
}
declare const parseSchemaDataUsageKeywords: <ForVariable extends boolean = false>(keywords: string | (string | Falsish$1)[], forVariable?: ForVariable) => SchemaDataUsage & (ForVariable extends true ? {
    dynamic?: boolean;
} : {});

interface SchemaDefinitionEntity extends Partial<SchemaDataUsage> {
    description?: string;
}
interface VersionedSchemaEntity extends SchemaDefinitionEntity {
    /**
     * The version of a schema or type following SemVer 2.0 conventions.
     *
     * If specified, data will be associated with this version when stored which makes it possible to handle
     * schema changes in user code. The platform does not provide any features for this by itself.
     */
    version?: string;
}

type SchemaEnumTypeDefinition = {
    primitive?: "string";
    enum: string[];
} | {
    primitive?: "number";
    enum: number[];
};

interface SchemaObjectTypeDefinition extends Partial<SchemaDataUsage> {
    /**
     * May be used to override the type name if it does not match the keys in the schema.
     */
    name?: string;
    /**
     * The type inherits properties from these other types.
     *
     * Data usage will be inherited by these types in order, that is, if both the first and last
     * type has a data classification, the last one wins.
     */
    extends?: string[];
    /** The properties of the type. */
    properties: {
        [P in string]: SchemaPropertyDefinition;
    };
}
declare const SCHEMA_TYPE_PROPERTY = "@schema";
declare const SCHEMA_PRIVACY_PROPERTY = "@privacy";
declare const clearSchemaMetadata: <T>(value: T, clone?: boolean) => T extends Nullish ? T : PickUnion<T, Exclude<keyof T, typeof SCHEMA_TYPE_PROPERTY | typeof SCHEMA_PRIVACY_PROPERTY>>;
type SchemaTypedDataTypeInfo = string;
interface SchemaTypedDataPrivacyInfo {
    /**
     * The properties that have been removed because they would violate a user's consent or are read outside a trusted environment.
     *
     * Only update censored data with patch operations, lest data will be lost otherwise.
     */
    censored?: string[];
}
interface SchemaTypedData {
    [SCHEMA_TYPE_PROPERTY]?: SchemaTypedDataTypeInfo;
    [SCHEMA_PRIVACY_PROPERTY]?: SchemaTypedDataPrivacyInfo;
}

type SchemaPropertyDefinition = SchemaDefinitionEntity & SchemaPropertyTypeDefinition & {
    required?: boolean;
    default?: any;
};
type AnySchemaTypeDefinition = SchemaPrimitiveTypeDefinition | SchemaEnumTypeDefinition | SchemaArrayTypeDefinition | SchemaRecordTypeDefinition | SchemaTypeDefinitionReference | SchemaObjectTypeDefinition | SchemaUnionTypeDefinition;
type SchemaPropertyTypeDefinition = AnySchemaTypeDefinition | {
    reference: "base";
};

type SchemaRecordTypeDefinition = {
    key: SchemaPrimitiveTypeDefinition;
    value: SchemaPropertyTypeDefinition & {
        required?: boolean;
    };
};

type SchemaTypeDefinitionReference = {
    /**
     * The referenced version of the type following SemVer 2.0 conventions.
     *
     * The format is `namespace#name@version` where version is optional (omit to match any version).
     *
     * Namespace is optional if referencing types in the same schema, and the type version is always optional.
     *
     * Tail.js does currently not do anything to validate versions of type dependencies,
     * however this may be used when consuming tail.js data for analytical processing
     * since older versions of the schema(s) may be kept, and legacy migrations implemented.
     */
    reference: string;
};

interface SchemaTypeDefinition extends VersionedSchemaEntity, SchemaObjectTypeDefinition {
    /**
     * This type can only be extended by other types, and not define data by itself.
     */
    abstract?: boolean;
    /** The type is for events */
    event?: boolean;
}
type SchemaTypeSystemRole = "event" | "patch";
interface SchemaSystemTypeDefinition extends SchemaTypeDefinition {
    /**
     * Reserved for internal platform use only to identify core types that play special roles in the system.
     */
    system?: SchemaTypeSystemRole;
}

type SchemaUnionTypeDefinition = {
    union: AnySchemaTypeDefinition[];
};

type SchemaPrimitiveTypeDefinition = {
    primitive: "boolean" | "uuid" | "duration" | "date" | "timestamp";
} | {
    primitive: "datetime";
    format?: "iso" | "unix";
} | {
    primitive: "integer" | "number";
    format?: "percentage" | "decimal";
    min?: number | null;
    max?: number | null;
} | {
    primitive: "string";
    format?: "url" | "uri" | "urn" | "email";
    maxLength?: number | null;
};

type SchemaVariableDefinition = SchemaDefinitionEntity & AnySchemaTypeDefinition & {
    /** The value of the variable is calculated and cannot be set. */
    dynamic?: boolean;
};

type QualifiedSchemaTypeName = {
    namespace?: string;
    name: string;
    version?: string;
};
declare const parseQualifiedTypeName: (qualifiedName: string) => QualifiedSchemaTypeName;
declare const formatQualifiedTypeName: ({ namespace, name, version, }: QualifiedSchemaTypeName) => string;

interface SchemaAdapter {
    parse(source: any): SchemaDefinition[];
    serialize(schemas: readonly Schema[]): Json;
}

type ParseContext = {
    schema?: SchemaDefinition;
    node: any;
    refPaths: string[];
    schemas: SchemaDefinition[];
    types: Map<string, SchemaTypeDefinition & ParsedJsonSchemaTypeDefinition>;
    refs: {
        add(ref: string, id: string, type: AnySchemaTypeDefinition): void;
        resolve(ref: string, callback: (id: string, type: AnySchemaTypeDefinition) => void): void;
        pending(): string[];
    };
} & ({
    parent?: ParseContext;
    key?: undefined;
} | {
    parent: ParseContext;
    key: string | number;
});
declare const sourceJsonSchemaSymbol: unique symbol;
interface ParsedJsonSchemaTypeDefinition extends SchemaObjectTypeDefinition {
    [sourceJsonSchemaSymbol]: {
        schema: SchemaDefinition;
        remove: () => void;
    };
}
declare const createRootContext: (root: any) => ParseContext;
declare const getPath: (context: ParseContext) => any;
declare const contextError: (context: ParseContext, message: string) => never;
declare const navigateContext: (parent: ParseContext, key: string | number, proxy?: any) => {
    schema?: SchemaDefinition;
    node: any;
    refPaths: string[];
    schemas: SchemaDefinition[];
    types: Map<string, SchemaTypeDefinition & ParsedJsonSchemaTypeDefinition>;
    refs: {
        add(ref: string, id: string, type: AnySchemaTypeDefinition): void;
        resolve(ref: string, callback: (id: string, type: AnySchemaTypeDefinition) => void): void;
        pending(): string[];
    };
} & {
    parent: ParseContext;
    key: string | number;
};

declare const isJsonSchema: (node: any) => any;
declare const parseJsonSchema: (context: ParseContext) => undefined;
declare const parseDefinitions: (context: ParseContext) => void;

declare const parseAnnotations: <T extends SchemaDefinitionEntity>(context: ParseContext, target: T, forVariable?: boolean) => T;
declare const serializeAnnotations: (entity: SchemaEntity | SchemaVariable) => any;

declare const parseJsonProperty: (context: ParseContext, assign: (property: SchemaPropertyDefinition) => void, forVariable?: boolean) => undefined;

declare const isIgnoredObject: (node: any) => boolean;
declare const isJsonObjectType: (node: any) => any;
declare const parseJsonType: (context: ParseContext, root: boolean, forVariable?: boolean) => SchemaTypeDefinition & ParsedJsonSchemaTypeDefinition;

declare const serializeSchema: (schema: Pick<Schema, "namespace" | "description" | "types">, subSchemas: readonly Schema[], restrictProperties: boolean) => {
    $schema: string;
    $id: string;
    description: string | undefined;
    $defs: {};
};

declare class JsonSchemaAdapter implements SchemaAdapter {
    readonly rootNamespace: string | undefined;
    readonly restrictProperties: boolean;
    constructor(rootNamespace?: string, restrictProperties?: boolean);
    static parse(source: any): SchemaDefinition[];
    parse(source: any): SchemaDefinition[];
    serialize(schemas: readonly Schema[]): {
        $schema: string;
        $id: string;
        description: string | undefined;
        $defs: {};
    };
}

declare class MarkdownSchemaAdapter implements SchemaAdapter {
    parse(source: any): SchemaDefinition[];
    serialize(schemas: readonly Schema[]): string | undefined;
}

interface Schema extends SchemaEntity {
    source: SchemaDefinition;
    namespace: string;
    typesOnly: boolean;
    types: Map<string, SchemaObjectType>;
    events: Map<string, SchemaObjectType>;
    variables: Map<string, Map<string, SchemaVariable>>;
}

interface SchemaArrayType extends ValidatableSchemaEntity {
    item: SchemaPropertyType;
    source: SchemaArrayTypeDefinition;
}
declare const isSchemaArrayType: (value: any) => value is SchemaArrayType;

interface SchemaEntity extends QualifiedSchemaTypeName {
    /** The internal ID of the type. Use {@link qualifiedName} if referencing the type uniquely. */
    id: string;
    /**
     * The version of the type following SemVer 2.0 conventions.
     *
     * Tail.js does currently not do anything to validate versions of type dependencies,
     * however this may be used when consuming tail.js data for analytical processing
     * since older versions of the schema(s) may be kept, and legacy migrations implemented.
     */
    version?: string;
    /**
     * Namespace, name and version in the format `namespace#name@version`
     * where the version part is optional.
     *
     * Examples `uri:tailjs:core#TrackedEvent`, `https://my-company.org/#CrmCustomer@2.1.0`.
     *
     * Hint: Assuming you want to query all types from a namespace, or any version of a particular type,
     * you can use the separator chars for your queries, e.g. "starts with `uri:tailjs:core#`" will match all types in that namespace
     * because `#` is not a valid character in namespace names.
     * Similarly, "starts with `uri:tailjs:core#TrackedEvent@`" will give any version of the type, since `@` is not allowed in type names.
     */
    qualifiedName: string;
    description?: string;
    usage?: SchemaDataUsage;
    usageOverrides?: Partial<SchemaDataUsage> | undefined;
}

type SchemaVariableKey = Pick<VariableKey, "scope" | "key">;
interface SchemaObjectType extends SchemaEntity, ValidatableSchemaEntity {
    /** The schema that defines the type. */
    schema: Schema;
    /** The type cannot be used directly for data. */
    abstract: boolean;
    /** The type is defined in a property. */
    embedded: boolean;
    /** Base types this type extends directly. */
    extends: SchemaObjectType[];
    /** All types this type extends directly and indirectly through base types. */
    extendsAll: Set<SchemaObjectType>;
    /** Subtypes extending this type directly. */
    extendedBy: SchemaObjectType[];
    /** All types extending this type either directly or indirectly. */
    extendedByAll: Set<SchemaObjectType>;
    /** The properties the type declares itself. */
    ownProperties: {
        [P in string]: SchemaProperty;
    };
    /** All the type's properties including properties from the types it extends. */
    properties: {
        [P in string]: SchemaProperty;
    };
    /** The properties where this type is used */
    referencedBy: Set<SchemaProperty>;
    /**
     * The keys of the variables the type can be used for (scope / key).
     */
    variables?: Map<string, Set<string>>;
    /** The source definition. */
    source: SchemaObjectTypeDefinition | SchemaTypeDefinition;
    /** The minimum required usage for any data from this type to appear. */
    usage: SchemaDataUsage;
    system?: SchemaTypeSystemRole;
    toString(): string;
}
declare const isSchemaObjectType: (value: SchemaPropertyType) => value is SchemaObjectType;

interface SchemaPrimitiveType extends ValidatableSchemaEntity {
    primitive: SchemaPrimitiveTypeDefinition["primitive"];
    enumValues?: Set<string | number>;
    source: SchemaPrimitiveTypeDefinition | SchemaEnumTypeDefinition;
}
declare const hasEnumValues: (type: SchemaPropertyType | Nullish) => type is SchemaPrimitiveType & {
    enumValues: (string | number)[];
};

interface SchemaProperty extends SchemaEntity, ValidatableSchemaEntity {
    name: string;
    required?: boolean;
    type: SchemaPropertyType;
    schema: Schema;
    source: SchemaPropertyDefinition;
    declaringType: SchemaObjectType;
    baseProperty?: SchemaProperty;
}

type SchemaPropertyType = (SchemaPrimitiveType | SchemaArrayType | SchemaRecordType | SchemaObjectType | SchemaUnionType) & {
    toString(): string;
};

interface SchemaRecordType extends ValidatableSchemaEntity {
    key: SchemaPrimitiveType;
    value: SchemaPropertyType;
    source: SchemaRecordTypeDefinition;
}
declare const isSchemaRecordType: (value: any) => value is SchemaRecordType;

interface SchemaUnionType extends ValidatableSchemaEntity {
    union: SchemaPropertyType[];
    source: SchemaUnionTypeDefinition;
}

interface SchemaVariable extends ValidatableSchemaEntity {
    key: string;
    scope: string;
    usage?: SchemaDataUsage;
    description?: string;
    type: SchemaPropertyType;
    dynamic: boolean;
}

interface SchemaValidationContext {
    trusted?: boolean;
    targetPurpose?: DataPurposeName;
    consent?: DataUsage;
    optionalPurposes?: OptionalPurposes;
    /** Validate the value for a response related to a getter, (for example, dynamic variables rejects validation on set, but not on get). */
    forResponse?: boolean;
    /** Ignore if properties are required since the data is partial. */
    patch?: boolean;
}
type SchemaValueValidator = <T, CollectedErrors extends ValidationErrorContext[] | Nullish = Nullish>(target: T, current: any, context: SchemaValidationContext, errors?: ValidationErrorContext[], polymorphic?: boolean) => (T & SchemaTypedData) | (CollectedErrors extends Nullish ? never : typeof VALIDATION_ERROR_SYMBOL);
type SchemaCensorFunction = <T>(target: T, context: SchemaValidationContext, polymorphic?: boolean) => T | undefined;
interface ValidatableSchemaEntity {
    validate: SchemaValueValidator;
    censor: SchemaCensorFunction;
}

type ValidationErrorContext = {
    path: string;
    message: string;
    source: any;
    type: SchemaPropertyType | null;
    forbidden?: boolean;
};
declare const VALIDATION_ERROR_SYMBOL: unique symbol;
declare class ValidationError extends Error {
    constructor(errors: ValidationErrorContext[], message?: string);
}
declare const handleValidationErrors: <R, Collected extends ValidationErrorContext[] | Nullish>(action: (errors: ValidationErrorContext[]) => R | typeof VALIDATION_ERROR_SYMBOL, collectedErrors?: Collected, message?: string) => Collected extends Nullish ? Exclude<R, typeof VALIDATION_ERROR_SYMBOL> : R;
declare const formatValidationErrors: (errors: readonly ValidationErrorContext[], bullet?: string) => string;

declare const DEFAULT_CENSOR_VALIDATE: ValidatableSchemaEntity;

type SchemaDefinitionSource = {
    schema: SchemaDefinition;
    /**
     * Do not add events and variables from this schema to avoid name clashes.
     * Use this if the types from the schema are only referenced by other schemas that provide events and variables.
     */
    typesOnly?: boolean;
};
declare class TypeResolver {
    private readonly _schemas;
    private readonly _types;
    private readonly _systemTypes;
    private readonly _eventMapper;
    private readonly _variables;
    readonly schemas: readonly Schema[];
    private readonly _sourceDefinitions;
    readonly definitions: readonly SchemaDefinition[];
    private readonly _defaultUsage;
    constructor(definitions: readonly SchemaDefinitionSource[], defaultUsage?: SchemaDataUsage);
    getEventType<T>(eventData: T): T extends Nullish ? T : SchemaObjectType;
    getType<Required extends boolean = true>(typeName: string, required?: Required, defaultNamespace?: string): SchemaObjectType | (Required extends true ? never : undefined);
    getVariable<Required extends boolean = true>(scope: string, key: string, required?: Required): SchemaVariable | (Required extends true ? never : undefined);
    readonly types: {
        readonly [P in string]?: Readonly<SchemaObjectType>;
    };
    readonly variables: {
        readonly [P in VariableServerScope | (string & {})]?: {
            readonly [P in string]: Readonly<SchemaVariable>;
        };
    };
    subset(namespaces: string | string[]): TypeResolver;
}

type KnownVariableMap = {
    [scope: string]: {
        [key: string]: any;
    };
};
declare const variableScopeNames: {
    /**
     * Variables that are not bound to individuals, does not contain personal data, and not subject to censoring.
     * These may be used for purposes such as shared runtime configuration
     * or augmenting external entities with real-time data for personalization or testing.
     */
    readonly global: "global";
    /**
     * Variables that relates to an individual's current session. These are purged when the session ends.
     *
     * Session variables can only be read for the current session from untrusted contexts.
     */
    readonly session: "session";
    /**
     * Variables that relates to an individual's device.
     *
     * These variables are physically stored in the device where the available space may be very limited.
     * For example, do not exceed a total of 2 KiB if targeting web browsers.
     *
     * To prevent race conditions between concurrent requests, device data may temporarily be loaded into session storage.
     *
     * Any data stored here is per definition at least `indirect` since it is linked to a device.
     */
    readonly device: "device";
    /**
     * Variables that relates to an individual across devices.
     *
     * Associating a user ID with a session can only happen from a trusted context,
     * but data for the associated user can then be read from untrusted contexts unless a `trusted-only` restriction is put on the data.
     *
     * Any data stored here is per definition at least `direct` since it directly linked to an individual.
     */
    readonly user: "user";
};
type VariableExplicitServerScopes = "global";
type VariableServerScope = (typeof variableScopeNames)[keyof typeof variableScopeNames];
declare const VariableServerScope: _tailjs_util.EnumParser<{
    /**
     * Variables that are not bound to individuals, does not contain personal data, and not subject to censoring.
     * These may be used for purposes such as shared runtime configuration
     * or augmenting external entities with real-time data for personalization or testing.
     */
    readonly global: "global";
    /**
     * Variables that relates to an individual's current session. These are purged when the session ends.
     *
     * Session variables can only be read for the current session from untrusted contexts.
     */
    readonly session: "session";
    /**
     * Variables that relates to an individual's device.
     *
     * These variables are physically stored in the device where the available space may be very limited.
     * For example, do not exceed a total of 2 KiB if targeting web browsers.
     *
     * To prevent race conditions between concurrent requests, device data may temporarily be loaded into session storage.
     *
     * Any data stored here is per definition at least `indirect` since it is linked to a device.
     */
    readonly device: "device";
    /**
     * Variables that relates to an individual across devices.
     *
     * Associating a user ID with a session can only happen from a trusted context,
     * but data for the associated user can then be read from untrusted contexts unless a `trusted-only` restriction is put on the data.
     *
     * Any data stored here is per definition at least `direct` since it directly linked to an individual.
     */
    readonly user: "user";
}>;
declare const VARIABLE_SYNTAX_RULES_TEXT = "Variables must be lowercase, start with a letter and then only user letters, numbers, underscores, dots and hyphens. (Keys prefixed with '@' are reserved for internal use.)";
/** Validates that the syntax for a key, scope or source in a variable conforms to the allowed syntax.  */
declare const validateVariableKeyComponent: (syntax: string) => boolean;
/**
 * Validates that spelling of the components in a variable key conforms to the allowed syntax.
 * If not, it returns the text for an error message, indicating which didn't, so be aware the truthy'ness of the return value is opposite
 * of what one might expect.
 */
declare const validateVariableKeySyntax: (key: VariableKey | Nullish) => string | undefined;
/**
 * A variable is a specific piece of information that can be classified and changed independently.
 * A variable can either be global or related to a specific entity or tracker scope.
 */
interface Variable<T extends {} = any> extends VariableKey {
    /**
     * This information is only provided if the variable is schema bound.
     */
    schema?: {
        type?: string;
        version?: string;
        usage: SchemaDataUsage;
    };
    /**
     * When the variable was created (Unix timestamp in milliseconds).
     */
    created: Timestamp;
    /**
     * When the variable was last modified. (Unix ms).
     */
    modified: Timestamp;
    /**
     * A unique token that changes every time a variable is updated.
     *
     * It follows the semantics of a "weak" ETag in the HTTP protocol.
     * How the value is generated is an internal implementation detail specific to the storage that manages the variable.
     *
     *
     */
    version: string;
    /**
     * This is a hint to variable storages that the variable should be deleted after this amount of milliseconds
     * unless updated or refreshed (via VariableStorage in @tailjs/engine set or refresh methods).
     *
     * Variable storages can decide how accurately they want to enforce this in the background,
     * yet it will be accurate from a client perspective, since tail.js filters out expired variables on read.
     */
    ttl?: number;
    /** If the variable has a time-to-live, this is when it should expire. */
    expires?: number;
    /**
     * The value of the variable. It must only be undefined in a set operation in which case it means "delete".
     */
    value: T;
}
/** Returns a description of a key that can be used for logging and error messages.  */
declare const formatVariableKey: ({ key, scope, entityId, source, }: {
    source?: string | null;
    scope?: string;
    key: string;
    entityId?: string;
}, error?: string | undefined) => string;
declare const extractKey: <T extends (Partial<VariableKey> & {
    key: string;
}) | Nullish>(value: T) => T extends infer T_1 ? Pick<T_1, keyof T_1 & ("source" | "key" | "scope" | "entityId")> extends infer T_2 ? { [P in keyof T_2]: T_2[P]; } : never : never;
declare const extractVariable: <T extends Partial<Variable> | Nullish>(variable: T) => MaybeNullish<Pick<Variable, keyof T & keyof Variable>, T>;
declare const removeLocalScopedEntityId: (variable: Variable) => Variable<any>;

interface ReadOnlyVariableGetter extends VariableKey {
    ifModifiedSince?: number;
    ifNoneMatch?: string;
    /**
     * The purpose for which the data will be used.
     * If unspecified, it will default to the purposes defined in the schema.
     */
    purpose?: DataPurposeName;
    /**
     * The maximum number of milliseconds the value of this variable can be cached.
     * If omitted or `true` the configured default value (3 seconds) will be used.
     * `false` or 0 means the variable will not be cached.
     *
     * @default true
     */
    cache?: number | boolean;
    /**
     * Do not accept a cached version of the variable.
     */
    refresh?: boolean;
    /** Time-to-live after this read. */
    ttl?: number;
}
type VariableInitializerCallback<T extends {} = any> = () => MaybePromiseLike<T | null | undefined>;
interface VariableInitializer<T extends {} = any> extends ReadOnlyVariableGetter {
    init: VariableInitializerCallback<T>;
}
type VariableGetter<T extends {} = any> = ((ReadOnlyVariableGetter & {
    init?: undefined;
}) | VariableInitializer<T>) & {
    value?: never;
    patch?: never;
};
type VariableGetResult<T extends {} = any> = VariableErrorResult | VariableNotFoundResult | VariableNotModifiedResult | VariableValueErrorResult | VariableSuccessResult<T>;

/**
 * Uniquely addresses a variable by scope, target and key name.
 */
interface VariableKey {
    /**
     * An optional identifier of a specific variable storage such as "crm" or "personalization"
     * if not addressing tail.js's own storage.
     */
    source?: string | null;
    /** The scope the variable belongs to. */
    scope: string;
    /**
     * The name of the variable.
     *
     * A key may have a prefix that decides which variable storage it is routed to such as `crm:` or `personalization:`.
     * The prefix and the key are separated by a colon (`prefix:key`), and the key may not contain a colon itself.
     */
    key: string;
    /**
     * The ID of the entity in the scope the variable belongs to.
     *
     * In the global scope, variables augmenting external entities the IDs should be prefixed with the entity type such as `page:xxxx`
     * if they are not unique identifiers to avoid clashes.
     */
    entityId: string;
}

type KeyFilter<T = string> = StrictUnion<Iterable<T> | {
    not: Iterable<T>;
}>;
type RangeFilter<T> = StrictUnion<{
    eq: T;
} | (({
    gt?: T;
} | {
    gte: T;
}) & ({
    lt?: T;
} | {
    lte: T;
}))>;
declare const filterKeys: <T, Values, K = T>(filter: KeyFilter<K> | undefined, values: Iterable<T> & Values, key?: (item: T) => K) => Values | T[];
declare const filterRangeValue: <T>(value: T, filter: RangeFilter<T> | undefined, rank: (value: NonNullable<T>) => number) => boolean;
/** Queries the keys for a given entity. */
interface VariableQuery<Scopes extends string = string> {
    /**
     *  The sources to query. If omitted, all sources are queried.
     *  Use `null` or the empty string (`""`) for the default source.
     */
    sources?: KeyFilter<string | null>;
    /** Only query keys in this scopes. Takes precedence over {@link scopes}. */
    scope?: Scopes | Nullish;
    /** Only query keys in these scopes. If omitted, all scopes are queried. */
    scopes?: Scopes[];
    /** The keys to match. If omitted, all keys are targeted. */
    keys?: KeyFilter;
    /** The entities the query targets. */
    entityIds?: string[];
    /** Gets variables that have changed since this timestamp. (Not implemented). */
    ifModifiedSince?: number;
    /** Only query keys for variables with a data classification in this range. */
    classification?: RangeFilter<DataClassification>;
    /**
     * Only query keys for variables that have/do not have the combination of these purposes.
     */
    purposes?: DataPurposes;
}
interface VariablePurgeOptions {
    /**
     * Without this flag, purge filters not addressing specific entity IDs will fail as a safety measure.
     *
     * Also, bulk deletes are not allowed from untrusted context.
     */
    bulk?: boolean;
}
interface VariableQueryOptions {
    /**
     * The _preferred_ number of results before a cursor must be used to fetch the next set.
     *
     * The actual page size is determined by the storage.
     */
    page?: number;
    /** Used to fetch the next page of results returned from a previous query. */
    cursor?: string | null;
}
interface VariableQueryResult {
    variables: Variable[];
    /** The cursor to use if there are more results. */
    cursor?: string;
}
declare function iterateQueryResults<Query, Batch extends boolean = false>(storage: {
    query(query: Query, options: {
        cursor?: string;
    }): Promise<VariableQueryResult>;
}, query: Query, batch?: Batch): AsyncGenerator<Batch extends true ? Variable<any>[] : Variable, void, unknown>;

declare enum VariableResultStatus {
    Success = 200,
    Created = 201,
    NotModified = 304,
    BadRequest = 400,
    Forbidden = 403,
    NotFound = 404,
    Conflict = 409,
    Error = 500
}
type VariableSuccessStatusWithValue = VariableResultStatus.Success | VariableResultStatus.Created;
type VariableSuccessStatus = VariableSuccessStatusWithValue | VariableResultStatus.NotModified;
type VariableErrorStatus = VariableResultStatus.Forbidden | VariableResultStatus.NotFound | VariableResultStatus.BadRequest | VariableResultStatus.Conflict | VariableResultStatus.Error;
interface VariableResult extends VariableKey {
    status: VariableResultStatus;
}
interface VariableNotFoundResult extends VariableResult {
    status: VariableResultStatus.NotFound;
    value?: undefined;
    version?: undefined;
    message?: string;
}
interface VariableValueErrorResult extends VariableResult {
    status: VariableResultStatus.Forbidden | VariableResultStatus.BadRequest;
    error?: string;
    transient?: false;
}
interface VariableErrorResult extends VariableResult {
    status: VariableResultStatus.Error;
    error: string;
    transient?: boolean;
}
/** The variable operation succeeded, and the result represents a variable, or undefined if not found. */
declare const isVariableResult: {
    <T extends {} = any>(value: any, requireFound?: true): value is Variable<T>;
    <T extends {} = any>(value: any, requireFound: boolean): value is Variable<T> | undefined | {
        status: VariableResultStatus.NotFound;
        value?: undefined;
    };
};
/**
 * The variable existed so the result has a value,
 * or the variable did not exists, in which case the value can be interpreted as `null`.
 */
declare const isSuccessResult: {
    (value: any, 
    /** Whether "not found" is considered a success. */
    requireFound?: true): value is {
        status: VariableResultStatus.Success | VariableResultStatus.Created;
        version: string;
        value: {};
    } | {
        status: VariableResultStatus.Success;
        version?: undefined;
        value?: undefined;
    } | {
        status: VariableResultStatus.NotModified;
        version?: undefined;
        value?: undefined;
    };
    <T extends {} = any>(value: any, 
    /** Whether "not found" is considered a success. */
    requireFound: boolean): value is {
        status: VariableResultStatus.Success | VariableResultStatus.Created;
        value: T | undefined;
    } | {
        status: VariableResultStatus.NotModified | VariableResultStatus.NotFound;
    };
};
declare const isTransientError: (value: any) => value is {
    status: VariableResultStatus.Error;
    transient: true;
};
interface VariableConflictResult<T extends {} = any> extends VariableResult, Variable<T> {
    status: VariableResultStatus.Conflict;
}
interface VariableNotModifiedResult extends VariableResult {
    status: VariableResultStatus.NotModified;
    value?: undefined;
}
interface VariableSuccessResult<T extends {} = any> extends VariableResult, Variable<T> {
    status: VariableResultStatus.Success | VariableResultStatus.Created;
}
type AnyVariableResult<T extends {} = any> = VariableGetResult<T> | VariableSetResult<T>;

interface VariableValueSetter<T extends {} = any> extends VariableKey {
    /** The value to set. `null` or `undefined` means "delete". */
    value: T | null | undefined;
    /** Expire the variable if not changed or accessed within this number of ms. */
    ttl?: number;
    /** Ignore version and disable optimistic concurrency. */
    force?: boolean;
    /**
     * The version of the variable when a client read it.
     * This is used for optimistic concurrency, that is, providing an obsolete version of a variable will result in a conflict error,
     * where the client will have to decide whether and how to reapply its updates.
     *
     * @default null
     */
    version?: string | null;
    patch?: undefined;
}
/**
 * The two types need to be separate in this definition in order for the result to be inferred correctly
 * in {@link VariablePatch} (where they must be equal, anything else would not make sense).
 *
 * As an example, the type would be inferred as `never` in the below, had we used the same type for current and result.
 *  `(current: {x: number, y?: string})=>({x: 100, y: "test"})`
 *  since `{x: number, y:string}` does _not_ extend `{x:number, y?:string}` (required string does not extend optional string).
 *
 */
type VariablePatchFunction<Current extends {}, Patched extends Current = Current> = (current: Current | undefined) => MaybePromiseLike<Patched | null | undefined>;
interface VariablePatch<Current extends {}, Patched extends Current = Current> extends VariableKey {
    ttl?: number;
    /**
     * Apply a patch to the current value.
     *
     * `null` and `undefined` means "delete". Return the current value to do nothing.
     * */
    patch: VariablePatchFunction<Current, Patched>;
}
type VariableSetter<T extends {} = any, Patched extends T = T> = VariableValueSetter<T> | VariablePatch<T, Patched>;
interface VariableDeleteResult extends VariableResult {
    status: VariableResultStatus.Success;
    value?: undefined;
}
type VariableSetResult<T extends {} = any> = VariableErrorResult | VariableConflictResult<T> | VariableNotFoundResult | VariableValueErrorResult | VariableDeleteResult | VariableSuccessResult<T>;

type NotString<S> = string extends S ? never : S;
type Lookup<T, Source, Key> = unknown extends Key ? never : T[keyof T & NotString<Source[Key & keyof Source]>];
type KnownTypeFor<Operation, KnownTypes extends KnownVariableMap, Default = unknown> = IfNever<Lookup<Lookup<KnownTypes, Operation, "scope">, Operation, "key">, Default> & {};
type VariableCallback<Result = VariableResult, Return = any> = (result: Result) => MaybePromiseLike<Return>;
/**
 * If the callback returns `true` the variable will get polled, that is, the callback will be called again if the variable changes.
 * If the variable is deleted, the callback will be called with a NotFound get result.
 *
 * Polling currently only works client-side.
 */
type VariableGetterCallback<KeyType = VariableKey, T extends {} = any> = VariableCallback<MatchScopes<VariableResultPromiseResult<"get", VariableGetResult<T>>, KeyType>, boolean | undefined | void>;
/**
 * If the callback returns `true` the variable will get polled, that is, the callback will be called again if the variable changes.
 * If the variable is deleted or not found, it will be called with `undefined`.
 *
 * Polling currently only works client-side.
 */
type VariablePollCallback<T extends {} = any> = (result: T | undefined, fromSourceOperation: boolean, previous: T | undefined) => MaybePromiseLike<boolean | undefined | void>;
type VariableSetterCallback<KeyType = VariableKey, T extends {} = any> = VariableCallback<MatchScopes<VariableResultPromiseResult<"set", VariableSetResult<T>>, KeyType>>;
type ValidOperationKeys = AllKeys<VariableGetter | VariableSetter | Variable> | "passive";
/**
 * Validate types for callbacks.
 */
type WithCallbacks<OperationType extends "get" | "set", Operation, KnownVariables extends KnownVariableMap> = Operation extends readonly any[] ? {
    [P in keyof Operation]: WithCallbacks<OperationType, Operation[P], KnownVariables>;
} : Operation extends {
    scope: any;
} ? {
    [P in keyof Operation]: P extends "patch" ? Operation[P] extends VariablePatchFunction<infer Current, infer Result> ? VariablePatchFunction<KnownTypeFor<Operation, KnownVariables, unknown extends Current ? Result : Current>> : never : P extends "value" ? KnownTypeFor<Operation, KnownVariables, any> | null | undefined : P extends "init" ? undefined | VariableInitializerCallback<KnownTypeFor<Operation, KnownVariables, any>> : P extends "callback" ? undefined | (OperationType extends "set" ? VariableSetterCallback<Operation, KnownTypeFor<Operation, KnownVariables, any>> : VariableGetterCallback<Operation, KnownTypeFor<Operation, KnownVariables, any>>) : [P, OperationType] extends ["poll", "get"] ? undefined | VariablePollCallback<KnownTypeFor<Operation, KnownVariables, any>> : P extends ValidOperationKeys ? Operation[P] : never;
} : Operation;
type TupleOrSelf<T> = T | readonly T[] | readonly [T];
type VariableOperationParameter<OperationType extends "get" | "set", Operation> = TupleOrSelf<Falsish$1 | (Operation & (OperationType extends "get" ? {
    callback?: VariableGetterCallback<Operation>;
    poll?: VariablePollCallback;
} : {
    callback?: VariableSetterCallback<Operation>;
}))>;
type VariableOperationResultItem<OperationType extends "get" | "set"> = OperationType extends "get" ? VariableGetResult : VariableSetResult;
type VariableOperationResult<OperationType extends "get" | "set", Operations, ScopeTemplate extends {
    scope: string;
    entityId?: string;
}, KnownTypes extends KnownVariableMap = never> = VariableResultPromise<OperationType, Operations, ScopeTemplate, KnownTypes>;
type GenericVariableValue = unknown;
type ReplaceKey<Target, Source> = Target extends infer Target ? {
    [P in keyof Target]: P extends keyof VariableKey ? Source[P & keyof Source] : Target[P];
} extends infer T ? {
    [P in keyof T]: T[P];
} : never : never;
type MapVariableResult<Operation, Type extends "success" | "all" | "value" = "success", Require extends boolean = false, KnownTypes extends KnownVariableMap = never, DefaultType extends {} = {}> = Operation extends Falsish$1 ? undefined : Operation extends readonly any[] ? {
    -readonly [P in keyof Operation]: MapVariableResult<Operation[P], Type, Require, KnownTypes>;
} : (Operation extends Pick<VariableValueSetter<infer Result>, "value"> | Pick<VariablePatch<infer Current, infer Result>, "patch"> ? [
    "set",
    ReplaceKey<VariableSetResult<unknown extends Current ? unknown extends Result ? KnownTypeFor<Operation, KnownTypes, GenericVariableValue> : Result : Current>, Operation> & {
        status: Exclude<VariableResultStatus, Result extends null ? never : VariableResultStatus.NotFound>;
    }
] : [Operation] extends [never] ? never : [
    "get",
    ReplaceKey<VariableGetResult<DefaultType & (Operation extends Pick<VariableInitializer<infer Result>, "init"> ? unknown extends Result ? KnownTypeFor<Operation, KnownTypes, GenericVariableValue> : Result : KnownTypeFor<Operation, KnownTypes, GenericVariableValue>)> & {
        status: Exclude<VariableResultStatus, ([Operation] extends [
            {
                ifModifiedSince: number;
            } | {
                ifNoneMatch: string;
            }
        ] ? never : VariableResultStatus.NotModified) | ([Operation] extends [{
            init: any;
        }] ? never : VariableResultStatus.Created | VariableValueErrorResult["status"])>;
    }, Operation>
]) extends [infer OperationType, infer Result] ? (Type extends "all" ? Result : Result extends {
    status: VariableResultStatus.NotFound;
} ? Require extends true ? never : OperationType extends "get" ? undefined : never : Result extends {
    status: VariableResultStatus.NotModified;
} ? Type extends "value" ? undefined : VariableResultPromiseResult<OperationType, Result> : Result extends {
    status: VariableSuccessStatus;
    value?: any;
} ? OperationType extends "get" ? Type extends "value" ? Result["value"] : Result : Operation extends {
    value?: null | undefined;
} ? Type extends "value" ? undefined : Result & {
    version?: undefined;
    value?: undefined;
} : Type extends "value" ? Result["value"] & Operation[keyof Operation & "value"] : Result & Pick<Operation, keyof Operation & "value"> : never) extends infer Result ? Type extends "value" ? Result : Result extends undefined ? undefined : Result extends {
    [x: string]: never;
} ? never : VariableResultPromiseResult<OperationType, Result> : never : never;
type VariableResultPromise<OperationType extends "get" | "set", Operations, ScopeTemplate extends {
    scope: string;
    entityId?: string;
}, KnownTypes extends KnownVariableMap = never> = unknown[] extends Operations ? VariableResultPromise<OperationType, VariableOperationResultItem<OperationType>[], ScopeTemplate> : unknown extends Operations ? VariableResultPromise<OperationType, VariableOperationResultItem<OperationType>, ScopeTemplate> : Promise<MatchScopes<MapVariableResult<Operations, "success", false, KnownTypes>, ScopeTemplate>> & {
    /** Return all variable results with error status codes instead of throwing errors. */
    all<T extends {} = {}>(): Promise<MatchScopes<MapVariableResult<Operations, "all", false, KnownTypes, T>, ScopeTemplate>>;
    successOnly<T extends {} = {}>(): Promise<MatchScopes<MapVariableResult<Operations, "success", true, KnownTypes, T>, ScopeTemplate>>;
    as<T extends {}>(): Promise<MatchScopes<MapVariableResult<Operations, "success", false, KnownTypes, T>, ScopeTemplate>>;
} & (Operations extends readonly any[] ? {
    values<T extends {} = {}>(require: true): Promise<MapVariableResult<Operations, "value", true, KnownTypes, T>>;
    values<T extends {} = {}>(require?: boolean): Promise<MapVariableResult<Operations, "value", false, KnownTypes, T>>;
} : {
    value<T extends {} = {}>(require: true): Promise<MapVariableResult<Operations, "value", true, KnownTypes, T>>;
    value<T extends {} = {}>(require?: boolean): Promise<MapVariableResult<Operations, "value", false, KnownTypes, T>>;
});
declare const formatVariableResult: (result: RestrictScopes<VariableResult, string, any>) => string;
declare class VariableStorageError<Operations extends undefined | {
    [Symbol.iterator]?: never;
} | readonly any[]> extends Error {
    readonly succeeded: MapVariableResult<Operations, "success">;
    readonly failed: Exclude<MapVariableResult<Operations, "all">, MapVariableResult<Operations, "success">>;
    constructor(operations: Operations, message: string);
}
declare const createPollCallback: <T extends {} = any>(op: {
    poll: VariablePollCallback<T>;
}, initialResult?: any) => ((value: VariableResult) => MaybePromiseLike<boolean | undefined | void>);
declare const toVariableResultPromise: <OperationType extends "get" | "set", Operations, Scope>(operationType: OperationType, operations: Operations | ArrayOrSelf<Falsish$1 | {
    scope: Scope;
}>, handler: (operations: RemoveScopeRestrictions<OperationType extends "get" ? VariableGetter : VariableSetter>[]) => Promise<Map<RemoveScopeRestrictions<VariableKey, true>, RemoveScopeRestrictions<VariableResult, true>>>, { poll, logCallbackError, }?: {
    poll?: (source: OperationType extends "get" ? VariableGetter : VariableSetter, callback: OperationType extends "get" ? VariableGetterCallback : VariableSetterCallback) => void;
    logCallbackError?: (message: string, operation: OperationType extends "get" ? VariableGetter : VariableSetter, error: any) => void;
}) => VariableResultPromise<OperationType, Operations, any>;
type VariableResultPromiseResult<OperationType, Result> = Result;

/**
 * Helper "function" to allow all scopes to be shown via intellisense. Otherwise, vscode won't show e.g. "global"
 * before an entityId has been provided.
 */
type RevealAllScopes<T> = T extends readonly any[] ? {
    [P in keyof T]: RevealAllScopes<T[P]>;
} : T extends {
    entityId?: undefined;
} ? Omit<T, "entityId"> & ({} | {
    entityId: undefined;
}) : T;
type MatchScopes<Target, KeyType> = unknown extends Target ? any : Target extends readonly any[] ? {
    [P in keyof Target]: MatchScopes<Target[P], KeyType>;
} : Target extends {
    scope: string;
} ? KeyType extends {
    scope: string;
} ? Omit<Target, "entityId"> & Pick<KeyType, keyof Target & keyof KeyType & ("scope" | "entityId")> extends infer T ? {
    [P in keyof T]: T[P];
} : never : never : Target;
/**
 * Split a type the extends VariableKey into two version:
 *  - Explicit scopes where entityId is required
 *  - Implicit scopes where the entityId is implied, so it must either be omitted or undefined.
 *
 * It is possible to have the same scope both explicitly and implicitly for a generic signature for helper functions.
 */
type RestrictScopes<Target, Scopes extends string = string, Explicit extends Scopes = Scopes, Implicit extends Scopes = Exclude<Scopes, Explicit>> = MatchScopes<Target, unknown extends Scopes ? any : unknown extends Explicit ? {
    scope: Scopes;
    entityId?: string;
} : Exclude<{
    scope: Exclude<Implicit, Explicit>;
    entityId?: undefined;
} | {
    scope: Exclude<Explicit, Implicit>;
    entityId: string;
} | {
    scope: Explicit & Implicit;
    entityId?: string;
}, {
    scope: never;
}>>;
type _ExplicitServerScopes<Scope extends boolean> = VariableExplicitServerScopes | (Scope extends true ? never : VariableServerScope);
type ServerScoped<Target, Scope extends boolean = true> = RestrictScopes<Target, VariableServerScope, _ExplicitServerScopes<Scope>, [
    boolean
] extends [Scope] ? Exclude<VariableServerScope, VariableExplicitServerScopes> : Exclude<VariableServerScope, _ExplicitServerScopes<Scope>>>;
type RemoveScopeRestrictions<KeyType, Covariant = false> = KeyType extends infer KeyType ? Omit<KeyType, "scope" | "entityId"> & (Covariant extends true ? {
    scope: any;
    entityId?: any;
} : {
    scope: any;
    entityId: any;
}) : never;

/**
 * The base type for all events that are tracked.
 *
 * The naming convention is:
 * - If the event represents something that can also be considered an entity like a "page view", "user location" etc. the name should be that.
 * - If the event indicates something that happened, like "session started", "view ended" etc. the name should end with a verb in the past tense.
 *
 * @id urn:tailjs:core:event
 * @system_type event
 * @abstract
 */
interface TrackedEvent extends Tagged {
    /**
     * The type name of the event.
     *
     * All concrete event types must override this property with a constant value, and it is an error to try
     * to store an event without a constant type.
     *
     * Since this is a system property that is ignored during censoring per default,
     * it automatically becomes anonymous and necessary in custom events without required properties unless the system
     * annotation is explicitly repeated.
     *
     */
    type: string;
    /**
     * The ID of the schema the event comes from. It is suggested that the schema ID includes a SemVer version number in the end. (e.g. urn:tailjs:0.9.0 or https://www.blah.ge/schema/3.21.0)
     */
    schema?: string;
    /**
     * This is assigned by the server. Only use {@link clientId} client-side.
     *
     */
    id?: Uuid;
    /**
     * This is set by the client and used to when events reference each other.
     */
    clientId?: LocalID;
    /** These properties are used to track the state of the event as it gets collected, and is not persisted. */
    metadata?: EventMetadata;
    /**
     * If set, it means this event contains updates to an existing event with this {@link clientId}, and should not be considered a separate event.
     * It must have the target event's {@link TrackedEvent.type} postfixed with "_patch" (for example "view_patch").
     *
     * Numbers in patches are considered incremental which means the patch will include the amount to add to an existing number (or zero if it does not yet have a value).
     * All other values are just overwritten with the patch values.
     *
     * Please pay attention to this property when doing analytics lest you may over count otherwise.
     *
     * Patches are always considered passive, cf. {@link EventMetadata.passive}.
     */
    patchTargetId?: LocalID;
    /**
     * The client ID of the event that caused this event to be triggered or got triggered in the same context.
     * For example, a {@link NavigationEvent} may trigger a {@link ViewEvent},
     * or a {@link CartUpdatedEvent} may be triggered with a {@link ComponentClickEvent}.
     *
     */
    relatedEventId?: LocalID;
    /**
     * The session associated with the event.
     */
    session?: Session;
    /**
     * When applicable, the view where the event happened (related by {@link ViewEvent}).
     */
    view?: LocalID;
    /**
     * If specified, it must be a negative number when sent from the client (difference between when the event was generated and when is was posted in milliseconds).
     *
     * The timestamp is assigned before it reaches a backend.
     *
     * @default now
     */
    timestamp?: Timestamp;
}
declare const isTrackedEvent: (ev: any) => ev is TrackedEvent;

declare const isPassiveEvent: (value: any) => value is {
    metadata: EventMetadata & {
        passive: true;
    };
};

interface UserInteractionEvent extends TrackedEvent {
    /**
     * Relevant components and their content in the scope of the activated element.
     */
    components?: ActivatedComponent[];
    /**
     * The content associated with an element that is not contained by a component.
     */
    content?: ActivatedComponent[];
    /** The time the event happened relative to the view were it was generated. */
    timeOffset?: ViewTimingData;
    /**
     * The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled).
     */
    pos?: ScreenPosition;
    /**
     * The viewport of the user's browser when the event happened.
     */
    viewport?: Viewport;
    /**
     * An optional name of the area of the page (i.e. in the DOM) where the component is rendered. By convention this should the path of nested content areas separated by a slash.
     */
    area?: string;
    /** Information about the activated element, if any. */
    element?: ElementInfo;
}

interface FormEvent extends UserInteractionEvent {
    type: "form";
    /**
     * The name of the form that was submitted.
     */
    name?: string;
    /**
     * Indicates whether the form was completed (that is, submitted).
     * If this is false it means that the form was abandoned.
     *
     * @default false
     */
    completed?: boolean;
    /**
     * The duration the user was actively filling the form.
     */
    activeTime?: Duration;
    /**
     * The total duration from the user started filling out the form until completion or abandonment.
     */
    totalTime?: Duration;
    /** All fields in the form (as detected). */
    fields?: Record<string, FormField>;
    /**
     * A correlation ID.
     * If a hidden input element has the name "_tailref", the HTML attribute "track-ref" or css variable "--track-ref: 1" its value will be used.
     * If all of the above is difficult to inject in the way the form is embedded,
     * the form element or any of its ancestors may alternatively have the HTML attribute "track-ref" with the name of the hidden input field that contains the reference.
     *
     * If no initial value a unique one will be assigned. Make sure to store the value in receiving end.
     */
    ref?: string;
}
declare const isFormEvent: (ev: any) => ev is FormEvent;

/**
 * The event is triggered when a component is clicked.
 *
 * This applies only to components that have click tracking configured,
 *  either via {@link TrackingSettings.clicked}, "track-clicks" in the containing DOM or "--track-clicks" via CSS.
 */
interface ComponentClickEvent extends UserInteractionEvent {
    type: "component_click";
}
declare const isComponentClickEvent: (ev: any) => ev is ComponentClickEvent;

/**
 * The event is triggered when a user probably wanted to click a component but nothing happened.
 *
 * Used for UX purposes where it may indicate that navigation is not obvious to the users.
 * This event is only triggered for components that contain navigation options (e.g. hyperlinks) and has click tracking enabled.
 *
 * This applies only to components that have click tracking configured,
 *  either via {@link TrackingSettings.clicked}, "track-clicks" in the containing DOM or "--track-clicks" via CSS.
 */
interface ComponentClickIntentEvent extends UserInteractionEvent {
    type: "component_click_intent";
    clicks?: Position[];
    elements?: ComponentElementInfo[];
}
declare const isComponentClickIntentEvent: (ev: any) => ev is ComponentClickIntentEvent;

/**
 * This event is triggered when the user scrolls a component into view if it is configured for this kind of tracking.
 */
interface ComponentViewEvent extends UserInteractionEvent {
    type: "component_view";
}
declare const isComponentViewEvent: (ev: any) => ev is ComponentViewEvent;

interface NavigationEvent extends UserInteractionEvent {
    type: "navigation";
    /**
     * The ID of the navigation event. This will be added as {@link TrackedEvent.relatedEventId} to view event that followed after the navigation.
     */
    clientId: LocalID;
    /** The destination URL of the navigation */
    href: string;
    /** Indicates that the user went away from the site to an external URL. */
    exit?: boolean;
    /** The anchor specified in the href if any. */
    anchor?: string;
    /** Indicates that the navigation is to an external domain  */
    external?: boolean;
    /** The domain of the destination */
    domain?: Domain;
    /**
     * Whether the navigation happened in the current view or a new tab/window was opened.
     */
    self: boolean;
}
declare const isNavigationEvent: (ev: any) => ev is NavigationEvent;

interface ScrollEvent extends UserInteractionEvent {
    type: "scroll";
    /**
     * The offset relative to the page size (100 % is bottom, 0 % is top)
     */
    offset: ScreenPosition;
    /**
     * The type of scrolling.
     */
    scrollType?: "fold" | "article-end" | "page-middle" | "page-end" | "read" | "offset";
}
declare const isScrollEvent: (ev: any) => ev is ScrollEvent;

interface SearchEvent extends UserInteractionEvent {
    type: "search";
    /**
     * The free-text query used for the search.
     */
    query?: string;
    /**
     * Any filters that were applied to the search in addition to the query.
     * Filters are assumed combined using "and" semantics unless they are for the same field in
     * which case it means that the field must match at least one of the values.
     *
     * For example "age>=10 AND age<=20 AND (type=horse OR type=cat)"
     */
    filters?: SearchFilter[];
    /** The number of results that matched the query. */
    hits?: Integer;
    /**
     * If some or all of the results are relevant for analytics or AI, they can be included here.
     */
    topHits?: SearchResult[];
}
interface SearchResult extends ExternalReference {
    rank: Integer;
}
/**
 * A filter that applies to a field in a search query.
 */
interface SearchFilter extends ExternalReference {
    /**
     * If the filter consisted of multiple groups of filters where one of them should match
     * this can be used to separate the groups.
     *
     * For example (age>=10 AND age<=20 AND type=horse) OR (age<5 AND type=cat).
     */
    group?: number;
    /**
     * The value the field must match. Use UNIX ms timestamps for dates and durations.
     * If the value is the ID of a defined entity use {@link reference} instead.
     */
    value?: string | number | boolean;
    /** If the value is a defined entity such as a product category use this instead of {@link value}. */
    reference?: ExternalReference;
    /**
     * How the field compares against the value.
     *
     * @default "eq"
     */
    comparison?: "<" | "<=" | "=" | "!=" | ">=" | ">";
}
/**
 * A search filter that applies to a single field that must match a defined entity (e.g. "manufacturer").
 */
interface SearchFieldReferenceFilter extends ExternalReference {
    /** A list of entities where the field must match at least one of them (or none depending on the comparison). */
    references?: ExternalReference[];
    comparison?: "eq" | "neq";
}
declare const isSearchEvent: (ev: any) => ev is SearchEvent;

/** @privacy anonymous */
interface SessionStartedEvent extends TrackedEvent {
    type: "session_started";
    url?: string;
    /**
     * The total number of sessions from the given device (regardless of username).
     */
    sessionNumber?: Integer;
    /**
     * The time since the last session from this device.
     */
    timeSinceLastSession?: Duration;
}
declare const isSessionStartedEvent: (ev: any) => ev is SessionStartedEvent;

interface UserAgentLanguage {
    /**
     * The full language tag as specified by (RFC 5646/BCP 47)[https://datatracker.ietf.org/doc/html/rfc5646]
     */
    id: string;
    /**
     * The language name (ISO 639).
     */
    language: string;
    /**
     * Dialect (ISO 3166 region).
     */
    region?: string;
    /**
     * If it is the users primary preference.
     */
    primary: boolean;
    /**
     * The user's preference of the language (1 is highest).
     */
    preference: Integer;
}
interface UserAgentEvent extends TrackedEvent, SessionEvent {
    type: "user_agent";
    /**
     *  Has touch
     */
    hasTouch?: boolean;
    /**
     * The device type (inferred from screen size).
     * The assumption is:
     *   - anything width a logical device pixel width less than 480 is a phone,
     *   - anything with a logical device pixel width less than or equal to 1024 (iPad Pro12.9") is a tablet,
     *   - the rest are desktops.
     *
     * Device width is the physical width of the device regardless of its orientation.
     */
    deviceType?: "mobile" | "tablet" | "desktop";
    /**
     * User agent string
     */
    userAgent: string;
    /**
     * The user's language preferences as configured in the user's device.
     */
    languages?: UserAgentLanguage[];
    timezone: {
        iana: string;
        /**
         * The offset from GMT in hours.
         */
        offset: Float;
    };
    /**
     * Screen
     */
    screen?: {
        /**
         * Device pixel ratio (i.e. how many physical pixels per logical CSS pixel)
         */
        dpr: Float;
        /**
         * Device width.
         */
        width: Float;
        /**
         * Device height.
         */
        height: Float;
        /** The device was held in landscape mode.
         * @default false
         */
        landscape?: boolean;
    };
    /**
     * The browser is being controlled by automation (e.g., Selenium or Puppeteer).
     */
    webdriver?: boolean;
}
declare const isUserAgentEvent: (ev: any) => ev is UserAgentEvent;

interface ClickIds {
    google?: string;
    googleDoubleClick?: string;
    facebook?: string;
    microsoft?: string;
    googleAnalytics?: string;
}
/**
 * This event is sent a user navigates between views. (page, screen or similar).
 *
 * This event does not
 *
 */
interface ViewEvent extends TrackedEvent {
    type: "view";
    /**
     * @inheritdoc
     */
    clientId: LocalID;
    /**
     * The primary content used to generate the view including the personalization that led to the decision, if any.
     * If views are loaded asynchronously in a way where they are not available immediately after a user navigates to a URL
     * on the website, the view definition may follow from a separate patch event.
     */
    definition?: View;
    /**
     * The tab where the view was shown.
     */
    tab?: LocalID;
    /**
     * The fully qualified URL as shown in the address line of the browser excluding the domain.
     */
    href: string;
    /**
     * The hash part of the URL (/about-us#address).
     */
    hash?: string;
    /**
     * The path portion of the URL.
     */
    path?: string;
    /** For how long the view was active. This is set via patches */
    duration?: ViewTimingData;
    /**
     * The HTTP status for the response associated with the view.
     *
     * @default 200
     */
    httpStatus?: number;
    /**
     * Urchin Tracking Module (UTM) parameters as defined by (Wikipedia)[https://en.wikipedia.org/wiki/UTM_parameters].
     */
    utm?: {
        source?: string;
        medium?: string;
        campaign?: string;
        term?: string;
        content?: string;
    };
    /**
     * The query string parameters in the URL, e.g. utm_campaign.
     * Each parameter can have multiple values, for example If the parameter is specified more than once.
     * If the parameter is only specified once pipes, semicolons and commas are assumed to separate values (in that order).
     * A parameter without a value will get recorded as an empty string.
     * @example The URL https://www.foo.com/?utm_source=bar&utm_campaign=campaign1,campaign2&flag&gclid=123xyz&p1=a&p1=b&p2=a;b,c;d has these parameters:
     *  utm_source = ["bar"] \
     *  utm_campaign = ["campaign1", "campaign2"] \
     *  gclid = ["123xyz"] \
     *  flag = [""] \
     *  gclid=["123xyz"] \
     *  p1=["a", "b"] \
     *  p2=["a", "b,c", "d"]
     */
    queryString?: Record<string, string[]>;
    /**
     * The domain part of the href, if any.
     */
    domain?: Domain;
    /**
     * Indicates that this was the first view in the first tab the user opened.
     * Note that this is NOT tied to the session. If a user closes all tabs and windows for the site and then later navigates back to the site in the same session this flag will be set again.
     * @default false
     */
    landingPage?: boolean;
    /**
     * Indicates that no other tabs were open when the view happened.
     * This flag allows a backend to extend the definition of a session that can last indefinitely but still restart after inactivity.
     * By measuring the time between a view with this flag and the previous event from the same device, it is possible to see for how long the device has been away from the site.
     * @default false
     */
    firstTab?: boolean;
    /**
     * The tab number in the current session.
     */
    tabNumber?: Integer;
    /**
     * The view number in the current tab.
     * This is kept as a convenience, yet technically redundant since it follows from timestamps and context.
     * @default 1
     */
    tabViewNumber?: Integer;
    /**
     * Number of redirects that happened during navigation to this view.*/
    redirects?: Integer;
    /**
     * Navigation type.
     */
    navigationType?: "navigate" | "back-forward" | "prerender" | "reload";
    /**
     * The navigation happened without making an additional request to the server (the [History API](https://developer.mozilla.org/en-US/docs/Web/API/History_API)).
     */
    clientNavigation?: "push" | "replace";
    /**
     * Indicates whether the event was manually triggered through a tracker command, or happened automatically by the tracker's ability to infer navigation.
     *
     * @default "automatic"
     */
    mode?: "manual" | "automatic";
    /**
     * External referrer. Internal referrers follows from the event's {@link TrackedEvent["relatedView"]} field.
     */
    externalReferrer?: {
        href?: string;
        domain?: Domain;
    };
    /**
     * The size of the user's viewport (e.g. browser window) and how much it was scrolled when the page was opened.
     */
    viewport?: Viewport;
    /**
     * The type of view, e.g. "page" or "screen".
     *
     * @default "page"
     */
    viewType?: string;
}
declare const isViewEvent: (ev: any) => ev is ViewEvent;

/**
 * This event is triggered whenever the user's location changes.
 *
 * @privacy indirect, performance
 */
interface SessionLocationEvent extends TrackedEvent, SessionEvent {
    type: "session_location";
    /**
     * Like the bars indicating signal strength on mobile phones - higher is better, yet nobody knows the exact definition.
     */
    accuracy?: Percentage;
    /**
     * The continent is considered safe to store with anonymous tracking.
     *
     * @privacy anonymous, performance
     */
    continent?: GeoEntity;
    /**
     * The country is considered safe to store with anonymous tracking.
     *
     * @privacy anonymous, performance
     */
    country?: GeoEntity;
    subdivision?: GeoEntity;
    zip?: string;
    city?: GeoEntity;
    lat?: Float;
    lng?: Float;
}
declare const isClientLocationEvent: (ev: any) => ev is SessionLocationEvent;

/** The event that is triggered when a page scroll to a specific section based on an anchor in the URL (e.g. /page#section-3) */
interface AnchorNavigationEvent extends UserInteractionEvent {
    type: "anchor_navigation";
    /** The name of the anchor. */
    anchor: string;
}
declare const isAnchorEvent: (ev: any) => ev is AnchorNavigationEvent;

/**
 * The event that indicates whether a user has opted in to non-essential tracking used for purposes beyond non-personal, aggregated statistics or the storage of this consent itself.
 *
 * This event has a significant effect throughout the system since the lack of consent to non-essential tracking will prevent all non-essential cookies and identifiers to ever reach the user's device.
 * In the same way, such information is cleared if the user opts out.
 *
 * Backends are expected to respect this consent, yet IT IS NOT THE RESPONSIBILITY OF tailjs.JS TO ENFORCE IT since it has no way to know the domain context of the data it relays.
 *
 * The user's decision is stored in an essential cookie and updated accordingly with this event. Sending the event with {@link nonEssentialTracking} `false` revokes the consent if already given.
 * The event should ideally be sent from a cookie disclaimer.
 *
 * Granular consents to email marketing, external advertising and the like must be handled by other mechanisms than tracking events.
 * This event only ensures that non-essential tracking information is not stored at the user unless consent is given.
 *
 * Also, "consent" and "event" rhymes.
 */
interface ConsentEvent extends TrackedEvent {
    type: "consent";
    consent: UserConsent;
}
declare const isConsentEvent: (ev: any) => ev is ConsentEvent;

interface CommerceEvent extends TrackedEvent {
}

type CartAction = "add" | "remove" | "update" | "clear";
/**
 * Indicates that a shopping cart was updated.
 */
interface CartUpdatedEvent extends UserInteractionEvent, CommerceEvent, CartEventData {
    type: "cart_updated";
}
declare const isCartEvent: (ev: any) => ev is CartUpdatedEvent;

/**
 * An order submitted by a user.
 */
interface OrderEvent extends CommerceEvent, Order {
    type: "order";
}
declare const isOrderEvent: (ev: any) => ev is OrderEvent;

/**
 * The shopping cart was abandoned.
 * Currently there is no logic in the tracker to trigger this event automatically, hence a custom trigger must be implemented.
 *
 */
interface CartAbandonedEvent extends CommerceEvent, Order {
    type: "cart_abandoned";
    /**
     * The timestamp for the last time the shopping cart was modified by the user before abandonment.
     */
    lastCartEvent?: Timestamp;
}
declare const isCartAbandonedEvent: (ev: any) => ev is CartAbandonedEvent;

/**
 * Base event for events that related to an order changing status.
 */
interface OrderStatusEvent extends TrackedEvent {
    /**
     * A reference to the order that changed status.
     */
    order: string;
}
/**
 * An order was accepted.
 *
 * This may be useful to track if some backend system needs to validate if the order submitted by the user is possible,
 * or just for monitoring whether your site is healthy and actually processes the orders that come in.
 *
 * This event should also imply that the user got a confirmation.
 */
interface OrderConfirmedEvent extends OrderStatusEvent {
    type: "order_confirmed";
}
/**
 * An order was cancelled.
 */
interface OrderCancelledEvent extends OrderStatusEvent {
    type: "order_cancelled";
    /**
     * Indicates if the user cancelled the order or it happended during a background process.
     *
     * @default false;
     */
    cancelledByUser?: boolean;
}
/**
 * An order was cancelled.
 */
interface OrderCompletedEvent extends OrderStatusEvent {
    type: "order_completed";
}
declare const isOrderCancelledEvent: (ev: any) => ev is OrderCancelledEvent;
declare const isOrderCompletedEvent: (ev: any) => ev is OrderCancelledEvent;

/**
 * Events related to order payments.
 */
interface PaymentEvent extends CommerceEvent {
    /**
     * The reference to order for which payment was made, either {@link Order.orderId} or {@link Order.internalId}.
     */
    orderReference: string;
    /**
     * The amount paid.
     */
    amount: Decimal;
    /**
     * A domain specific value for the payment method.
     */
    paymentMethod?: string;
    /** The currency of the payment. */
    currency?: string;
}
/**
 * The payment for an order was accepted.
 */
interface PaymentAcceptedEvent extends PaymentEvent {
    type: "payment_accepted";
    /**
     * The payment was the final payment, hence completed the order.
     * @default true;
     */
    finalPayment?: boolean;
}
/**
 * A payment for the order was rejected.
 */
interface PaymentRejectedEvent extends PaymentEvent {
    type: "payment_rejected";
}
declare const isPaymentAcceptedEvent: (ev: any) => ev is PaymentAcceptedEvent;
declare const isPaymentRejectedEvent: (ev: any) => ev is PaymentRejectedEvent;

/**
 * Events related to users signing in, out etc..
 */
interface AuthenticationEvent extends TrackedEvent {
}
/**
 * A user signed in.
 */
interface SignInEvent extends AuthenticationEvent {
    type: "sign_in";
    /**
     * The user that signed in.
     */
    userId: string;
    /**
     * Custom data that can be used to validate the login server-side to make sure that userdata cannot get hijacked
     * by abusing the API.
     */
    evidence?: string;
}
/**
 * A user actively signed out. (Session expiry doesn't count).
 */
interface SignOutEvent extends AuthenticationEvent {
    type: "sign_out";
    /**
     * The user that signed out.
     */
    userId?: string;
}
declare const isSignOutEvent: (ev: any) => ev is SignOutEvent;
declare const isSignInEvent: (ev: any) => ev is SignInEvent;

/**
 * Events implementing this interface are supporting the infrastructure and should not appear in BI/analytics.
 */
interface SystemEvent extends TrackedEvent {
}

interface ImpressionTextStats extends Omit<TextStats, "boundaries"> {
}
/**
 * The event is triggered when more than 75 % of the component's has been visible for at least 1 second,
 * or the component has taken up at least 33 % of the viewport width or height for at least 1 second, whichever comes first.
 *
 *
 * This only gets tracked for components that have impression tracking configured,
 *  either via {@link TrackingSettings.impressions}, "track-impressions" in the containing DOM or "--track-impressions" via CSS.
 *
 * Note that impression tracking cannot be configured via the DOM/CSS for secondary and inferred components
 * since the number of these can be considerable and it would hurt performance.
 * Impression tracking is still possible for these if explicitly set via {@link TrackingSettings.impressions}.
 *
 */
interface ImpressionEvent extends UserInteractionEvent {
    type: "impression";
    /**
     * The number of times the component was sufficiently visible  to count as an impression.
     * This counter will increment if the component leaves the user's viewport and then comes back.
     *
     */
    impressions?: Integer;
    /**
     * For how long the component was visible. This counter starts after an impression has been detected.
     */
    duration?: ViewTimingData;
    /**
     * Detailed information about the parts of the component that was viewed.
     * This information is only provided if the component spans more than 125 % of the viewport's height.
     */
    regions?: {
        /** The top 25 % of the component. */
        top?: ImpressionRegionStats;
        /** The middle 25 - 75 % of the component. */
        middle?: ImpressionRegionStats;
        /** The bottom 25 % of the component. */
        bottom?: ImpressionRegionStats;
    };
    /**
     * The length and number of words in the component's text.
     * This combined with the active time can give an indication of how much the user read if at all.
     */
    text?: ImpressionTextStats;
    /**
     * The percentage of the component's area that was visible at some point during the {@link View}.
     */
    seen?: Percentage;
    /**
     * The percentage of the text the user can reasonably be assumed to have read
     *  based on the number of words and duration of the impression.
     */
    read?: Percentage;
}
interface ImpressionRegionStats {
    duration?: Duration;
    impressions?: Integer;
    seen?: Percentage;
    /**
     * The percentage of the component's area that was visible at some point during the {@link View}.
     */
    read?: Percentage;
}
declare const isImpressionEvent: (ev: any) => ev is ImpressionEvent;

/**
 * An event that can be used to reset the current session and optionally also device.
 * Intended for debugging and not relayed to backends.
 */
interface ResetEvent extends TrackedEvent, SystemEvent {
    type: "reset";
    /**
     * Whether only the session or also the device should be reset.
     *
     * @default false
     */
    includeDevice?: boolean;
    /**
     * Whether to also reset the consent.
     *
     * @default false
     */
    includeConsent?: boolean;
}
declare const isResetEvent: (ev: any) => ev is ResetEvent;

type MapTagOptions = {
    prefix?: string;
    ns?: string;
    eventType?: string;
};
type TagMap = {
    [tag: string]: TagMapEntry;
} & {
    [P in keyof BoundaryDataTag]?: never;
};
type TagValue = Falsish$1 | string | boolean | Omit<Tag, "tag">;
type TagMapEntry = TagValue | TagValue[] | TagMap;
type ParsableTags = TagMap | Tag | Iterable<ParsableTags> | string | string[] | Falsish$1;
type BoundaryTagMap = {
    [tag: string]: BoundaryTagMapEntry;
} & {
    [P in keyof BoundaryDataTag]?: never;
};
type BoundaryTagValue = Falsish$1 | string | boolean | Omit<BoundaryDataTag, "tag">;
type BoundaryTagMapEntry = BoundaryTagValue | BoundaryTagValue[] | BoundaryTagMap;
type ParsableBoundaryTags = BoundaryTagMap | BoundaryDataTag | Iterable<ParsableBoundaryTags> | string | string[] | Falsish$1;
declare const mapTags: {
    (tags: ParsableTags, options?: MapTagOptions & {
        eventType?: undefined;
    }): Tag[] | undefined;
    (tags: ParsableBoundaryTags, options?: MapTagOptions): BoundaryDataTag[] | undefined;
};
/**
 * Parses tags from a string or array of strings and collects them in a map to avoid duplicates.
 *
 * Syntax #?[namespace::][tag][=value][~weight][,&].
 * Namespace and tags may contain any characters except whitespace, `,`, `=`, `"`, `~` and `&`.
 * Value must be quoted (`"value"` or `'value'`) if it contains any of the characters `,`, `~`, `&` or `~`. Escape the quote character with backslash (`\"` or `\'`) if needed.
 * The score may be any floating point number.
 *
 * Multi-level tags have their levels separated by `:` by convention.
 */
declare const collectTags: <Input extends ParsableTags>(parsableTag: Input, options?: MapTagOptions, collected?: Tag[]) => MaybeUndefined<Input, Tag[]>;
declare const encodeTag: <T extends Tag | null | undefined>(tag: T) => T extends Tag ? string : null | undefined;

declare const typeTest: <T extends TrackedEvent>(...types: string[]) => (ev: any) => ev is T;

export { type ActivatedComponent, type ActivatedContent, type AnchorNavigationEvent, type AnySchemaTypeDefinition, type AnyVariableResult, type AuthenticationEvent, type BoundaryDataTag, type BoundaryDataView, type BoundaryTagMap, type BoundaryTagMapEntry, type BoundaryTagValue, CORE_EVENT_DISCRIMINATOR, CORE_EVENT_TYPE, CORE_SCHEMA_NS, type CartAbandonedEvent, type CartAction, type CartEventData, type CartUpdatedEvent, type ClickIds, type CommerceData, type CommerceEvent, type Component, type ComponentClickEvent, type ComponentClickIntentEvent, type ComponentElementInfo, type ComponentTrackingBehavior, type ComponentViewEvent, type ConfiguredComponent, type ConsentEvent, type Content, DATA_PURPOSES_ALL, DEFAULT_CENSOR_VALIDATE, type DataAccess, DataClassification, type DataPurposeName, DataPurposes, type DataSource, DataUsage, DataVisibility, type Decimal, type DeviceInfo, type Domain, type Duration, EVENT_TYPE_PATCH_POSTFIX, type ElementInfo, type EventMetadata, type EventPatch, type ExtendedTrackingBoundaryData, type Extensible, type ExternalReference, type Float, type FormEvent, type FormField, type FormFieldTrackingLevel, type Funnel, type FunnelStage, type GeoEntity, type ImpressionEvent, type ImpressionRegionStats, type ImpressionTextStats, type ImpressionTrackingOptions, type Integer, JsonSchemaAdapter, type KeyFilter, type KnownTypeFor, type KnownVariableMap, type LocalID, type MapTagOptions, MarkdownSchemaAdapter, type MatchScopes, type NavigationEvent, type OptionalArray, type OptionalPurposes, type Order, type OrderCancelledEvent, type OrderCompletedEvent, type OrderConfirmedEvent, type OrderEvent, type OrderLine, type OrderQuantity, type OrderStatusEvent, type ParsableBoundaryTags, type ParsableTags, type ParseContext, type ParsedJsonSchemaTypeDefinition, type PaymentAcceptedEvent, type PaymentEvent, type PaymentRejectedEvent, type Percentage, type Personalizable, type Personalization, type PersonalizationSource, type PersonalizationVariant, type Position, type PostRequest, type PostResponse, type Poz, type PurposeTestOptions, type QualifiedSchemaTypeName, type RangeFilter, type ReadOnlyVariableGetter, type Rectangle, type RemoveScopeRestrictions, type ResetEvent, type RestrictScopes, type RevealAllScopes, SCHEMA_DATA_USAGE_ANONYMOUS, SCHEMA_DATA_USAGE_MAX, SCHEMA_PRIVACY_PROPERTY, SCHEMA_TYPE_PROPERTY, type Schema, type SchemaAdapter, type SchemaArrayType, type SchemaArrayTypeDefinition, type SchemaCensorFunction, type SchemaDataUsage, type SchemaDefinition, type SchemaDefinitionEntity, type SchemaDefinitionSource, type SchemaEntity, type SchemaEnumTypeDefinition, type SchemaObjectType, type SchemaObjectTypeDefinition, type SchemaPrimitiveType, type SchemaPrimitiveTypeDefinition, type SchemaProperty, type SchemaPropertyDefinition, type SchemaPropertyType, type SchemaPropertyTypeDefinition, type SchemaRecordType, type SchemaRecordTypeDefinition, type SchemaSystemTypeDefinition, type SchemaTypeDefinition, type SchemaTypeDefinitionReference, type SchemaTypeSystemRole, type SchemaTypedData, type SchemaTypedDataPrivacyInfo, type SchemaTypedDataTypeInfo, type SchemaUnionType, type SchemaUnionTypeDefinition, type SchemaValidationContext, type ValidationErrorContext as SchemaValidationError, type SchemaValueValidator, type SchemaVariable, type SchemaVariableDefinition, type SchemaVariableKey, type ScopeInfo, type ScopeVariables, type ScreenPosition, type ScrollEvent, type SearchEvent, type SearchFieldReferenceFilter, type SearchFilter, type SearchResult, type ServerScoped, type Session, type SessionEvent, type SessionInfo, type SessionLocationEvent, type SessionStartedEvent, type SignInEvent, type SignOutEvent, type Size, type SystemEvent, type Tag, type TagMap, type TagMapEntry, type TagValue, type Tagged, type Timestamp, type TrackedEvent, type TrackingBehavior, type TrackingBoundaryData, type TrackingSettings, TypeResolver, type UpdateFunction, type UpdateStateOptions, type UserAgentEvent, type UserAgentLanguage, type UserConsent, type UserInteractionEvent, type UserScoped, type Uuid, type UuidV4, VALIDATION_ERROR_SYMBOL, VARIABLE_SYNTAX_RULES_TEXT, type ValidatableSchemaEntity, ValidationError, type Variable, type VariableCallback, type VariableConflictResult, type VariableDeleteResult, type VariableErrorResult, type VariableErrorStatus, type VariableExplicitServerScopes, type VariableGetRequest, type VariableGetResponse, type VariableGetResult, type VariableGetter, type VariableGetterCallback, type VariableInitializer, type VariableInitializerCallback, type VariableKey, type VariableNotFoundResult, type VariableNotModifiedResult, type VariableOperationParameter, type VariableOperationResult, type VariablePatch, type VariablePatchFunction, type VariablePollCallback, type VariablePurgeOptions, type VariableQuery, type VariableQueryOptions, type VariableQueryResult, type VariableResult, type VariableResultPromise, type VariableResultPromiseResult, VariableResultStatus, VariableServerScope, type VariableSetRequest, type VariableSetResponse, type VariableSetResult, type VariableSetter, type VariableSetterCallback, VariableStorageError, type VariableSuccessResult, type VariableSuccessStatus, type VariableSuccessStatusWithValue, type VariableValueErrorResult, type VariableValueSetter, type VersionedSchemaEntity, type View, type ViewEvent, type ViewTimingData, type Viewport, type WithCallbacks, appendTrackingData, cleanBoundaryDataProperties, clearMetadata, clearSchemaMetadata, collectTags, contextError, createPollCallback, createRootContext, encodeTag, externalReferencesEqual, extractKey, extractVariable, filterKeys, filterRangeValue, formatDataUsage, formatQualifiedTypeName, formatValidationErrors, formatVariableKey, formatVariableResult, getExternalReferenceKey, getPath, getTagKey, handleValidationErrors, hasComponentOrContent, hasEnumValues, isAnchorEvent, isCartAbandonedEvent, isCartEvent, isClientLocationEvent, isComponentClickEvent, isComponentClickIntentEvent, isComponentViewEvent, isConsentEvent, isEmptyTrackingData, isEventPatch, isFormEvent, isIgnoredObject, isImpressionEvent, isJsonObjectType, isJsonSchema, isNavigationEvent, isOrderCancelledEvent, isOrderCompletedEvent, isOrderEvent, isPassiveEvent, isPaymentAcceptedEvent, isPaymentRejectedEvent, isPostResponse, isResetEvent, isSchemaArrayType, isSchemaObjectType, isSchemaRecordType, isScrollEvent, isSearchEvent, isSessionStartedEvent, isSignInEvent, isSignOutEvent, isSuccessResult, isTrackedEvent, isTransientError, isUserAgentEvent, isVariableResult, isViewEvent, iterateQueryResults, mapTags, navigateContext, normalizeTrackingData, parseAnnotations, parseDefinitions, parseJsonProperty, parseJsonSchema, parseJsonType, parseQualifiedTypeName, parseSchemaDataUsageKeywords, removeLocalScopedEntityId, serializeAnnotations, serializeSchema, sourceJsonSchemaSymbol, toVariableResultPromise, typeTest, uniqueReferences, uniqueTags, validateConsent, validateVariableKeyComponent, validateVariableKeySyntax };
