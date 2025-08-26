import * as _tailjs_util from '@tailjs/util';
import { ToggleArray, ArrayOrSelf, Nullish, MaybeNullish, MaybeArray, ParsableRegExp, PickRequired, MaybePromiseLike } from '@tailjs/util';
import * as _tailjs_types from '@tailjs/types';
import { VariableOperationParameter, WithCallbacks, VariableOperationResult, PostResponse, EventPatch, PostRequest, TrackedEvent, LocalID, View, SessionInfo, UserConsent, DeviceInfo, VariableServerScope, RestrictScopes, ServerScoped, VariableKey, Variable, VariableGetter, VariablePollCallback, VariableGetRequest, VariableSetter, VariableResultPromiseResult, VariableGetResult, VariableGetResponse, VariableSetResult, VariableGetterCallback, VariableSetterCallback, TrackingBehavior, TrackingBoundaryData, ParsableTags, CartAction, CartEventData, FormFieldTrackingLevel, DataClassification, UserAgentEvent, ViewEvent, ViewTimingData, ConfiguredComponent, ActivatedComponent, ActivatedContent, Tag, Order, Component, ExternalReference, BoundaryDataView } from '@tailjs/types';

type NodeWithParentElement = Node | EventTarget;

interface TrackerVariableStorage {
    get<Getters extends VariableOperationParameter<"get", ClientVariableGetter & {
        key: Keys;
        scope: Scopes;
    }>, Keys extends string, Scopes extends string>(getters: WithCallbacks<"get", Getters, ReservedTrackerVariables>): VariableOperationResult<"get", Getters, ClientVariableKey, ReservedTrackerVariables>;
    set<Setters extends VariableOperationParameter<"set", ClientVariableSetter & {
        key: Keys;
        scope: Scopes;
    }>, Keys extends string, Scopes extends string>(setters: WithCallbacks<"set", Setters, ReservedTrackerVariables>): VariableOperationResult<"set", Setters, ClientVariableKey, ReservedTrackerVariables>;
}

interface EventQueuePostOptions {
    flush?: boolean;
    async?: boolean;
    variables?: PostRequest["variables"];
}
type ProtectedEvent = TrackedEvent & UnlockApiCommand;
interface EventQueue {
    /**
     * Posts events to the server. Do not post event patches using this method. Use {@link postPatch} instead.
     * If flush is not explicitly requested, the event will eventually get posted, either by the configured post frequency, or when the user leaves the tab.
     */
    post<T extends ToggleArray<ProtectedEvent>, Options extends EventQueuePostOptions | undefined>(events: T, options?: Options): Promise<Options extends {
        async: false;
    } ? PostResponse : void>;
    /**
     *  Posts a patch to an existing event.
     */
    postPatch<T extends ProtectedEvent>(target: T, patch: EventPatchData<T>, flush?: boolean): Promise<void>;
    /**
     * Registers a passive event.
     *
     * The source will get invoked whenever the tab becomes deactivated. If the source returns undefined or false, the source is unregistered.
     * The return value is a function to manually unregister the source.
     */
    registerEventPatchSource<T extends ProtectedEvent>(sourceEvent: T, source: EventPatchSource<T>, initialPost?: boolean, relatedNode?: Node): () => undefined;
}
type EventPatchData<T extends ProtectedEvent> = Omit<EventPatch<T>, "patchTargetId" | "metadata" | "type"> & {
    type?: undefined;
};
type EventPatchSource<T extends ProtectedEvent = ProtectedEvent> = (current: EventPatchData<T>, unbind: () => undefined) => EventPatchData<T> | undefined;

/** The operations on the tail.js tracker that are both valid before and after it has been initialized.  */
interface ProvisionalTracker {
    /** Executes the specified commands. */
    (...args: ArrayOrSelf<TrackerCommand | Nullish>[]): void;
    /**
     * Executes the specified commands.
     *
     * Use this overload if a {@link TrackerClientConfiguration.key} has been configured.
     *
     */
    (key: string, ...args: ArrayOrSelf<TrackerCommand | Nullish>[]): void;
    /**
     * Allows commands to be passed as an HTTP encoded string or JSON instead of objects. This may be useful for server-side generated data.
     *
     * Use this overload if a {@link TrackerClientConfiguration.key} has been configured.
     */
    (key: string, encoded: string): void;
    /** Allows commands to be passed as an HTTP encoded string or JSON instead of objects. This may be useful for server-side generated data. */
    (encoded: string): void;
}
/** The tracker after it has been initialized */
interface Tracker extends ProvisionalTracker {
    /**
     * A unique identifier for the tracker instance.
     */
    readonly id: string;
    /**
     * A flag that indicates that the tracker has been initialized.
     */
    readonly initialized?: boolean;
    readonly events: EventQueue;
    readonly variables: TrackerVariableStorage;
    /**
     * The tracker was initialized during server-side rendering.
     */
    readonly ssr?: boolean;
    /**
     * Convenience method to reset session and device data, and then prevent the tracker from posting further events.
     * This method is only available in debug mode to raise the entry barrier for pranksters who can inject scripts.
     */
    readonly reset?: (includeDevice?: boolean) => void;
}

declare const SCOPE_INFO_KEY = "@info";
declare const CONSENT_INFO_KEY = "@consent";

type ReferringViewData = [
    viewId: LocalID,
    relatedEventId: LocalID | undefined
];
interface CurrentView extends View {
    /**
     * If the view is updated, and this is set, it is considered navigation.
     * Use this if you have implemented custom navigation that does not make use of
     * history.push/replace.
     */
    navigation?: boolean;
}
type ReservedTrackerVariables = {
    session: {
        [SCOPE_INFO_KEY]: SessionInfo;
        [CONSENT_INFO_KEY]: UserConsent;
    };
    device: {
        [SCOPE_INFO_KEY]: DeviceInfo;
    };
    view: {
        view: CurrentView;
        loaded: boolean;
        referrer: string;
    };
    shared: {
        tabIndex: number;
        viewIndex: number;
        referrer: [viewId: string | undefined, navigationEventId: string];
    };
};
declare const levels: {
    /**
     * Variables that are only available in memory in the current view, and lost as soon as the user navigates away (without bf_cache) or closes the browser.
     *
     * Data in this scope may be used without user consent (anonymous tracking), however if it is used in logic for event tracking
     * make sure it does not contain personal information that may identify the user, hence violate the premise for the otherwise anonymously
     * collected data.
     *
     *
     */
    readonly view: "view";
    /**
     * Variables that are only available in the current tab, including between views in the same tab as navigation occurs, but lost as soon as the user closes the tab.
     *
     * Data is encrypted at rest, yet only available if the user has consented to data being stored for the variables' purposes.
     */
    readonly tab: "tab";
    /**
     * Variables that are shared between open tabs, and lost as soon as the last tab is closed.
     * These variables are kept entirely in memory and shared via messaging which means they are never persisted in the user's
     * device between browser restarts.
     *
     * Use the server-side scopes `session`, `device` or `user` if the data must be persisted for a longer duration.
     */
    readonly shared: "shared";
};
type LocalVariableScope = (typeof levels)[keyof typeof levels];
type AnyVariableScope = VariableServerScope | LocalVariableScope;
declare const localVariableScope: _tailjs_util.EnumParser<{
    /**
     * Variables that are only available in memory in the current view, and lost as soon as the user navigates away (without bf_cache) or closes the browser.
     *
     * Data in this scope may be used without user consent (anonymous tracking), however if it is used in logic for event tracking
     * make sure it does not contain personal information that may identify the user, hence violate the premise for the otherwise anonymously
     * collected data.
     *
     *
     */
    readonly view: "view";
    /**
     * Variables that are only available in the current tab, including between views in the same tab as navigation occurs, but lost as soon as the user closes the tab.
     *
     * Data is encrypted at rest, yet only available if the user has consented to data being stored for the variables' purposes.
     */
    readonly tab: "tab";
    /**
     * Variables that are shared between open tabs, and lost as soon as the last tab is closed.
     * These variables are kept entirely in memory and shared via messaging which means they are never persisted in the user's
     * device between browser restarts.
     *
     * Use the server-side scopes `session`, `device` or `user` if the data must be persisted for a longer duration.
     */
    readonly shared: "shared";
}>;
declare const anyVariableScope: _tailjs_util.EnumParser<{
    user: "user";
    global: "global";
    session: "session";
    device: "device";
    parse<T extends number | Nullish | "user" | "global" | "session" | "device" | (string & {}), Validate extends boolean = true>(value: T, validate?: Validate | undefined): T extends Nullish ? undefined : "user" | "global" | "session" | "device" | (Validate extends true ? never : undefined);
    levels: ("user" | "global" | "session" | "device")[];
    ranks: {
        user: number;
        global: number;
        session: number;
        device: number;
    };
    compare(lhs: "user" | "global" | "session" | "device", rhs: "user" | "global" | "session" | "device"): number;
    view: "view";
    tab: "tab";
    shared: "shared";
}>;
type ClientScoped<Target, LocalOnly extends boolean = boolean> = LocalOnly extends true ? RestrictScopes<Target, LocalVariableScope, never> : ServerScoped<Target, true>;
type ClientVariableKey<LocalOnly extends boolean = boolean> = ClientScoped<VariableKey, LocalOnly>;
type ClientVariable<T extends {} = any, LocalOnly extends boolean = boolean> = ClientScoped<Variable<T>, LocalOnly>;
type ClientVariableGetter<T extends {} = any, LocalOnly extends boolean = boolean> = ClientScoped<VariableGetter<T>, LocalOnly> & {
    /**
     * This will be called with the result.
     *
     * Return `true` from the callback to poll for changes, that is, the callback will be invoked again next time the variable changes
     * until it returns something else than `true`.
     */
    callback?: ClientVariableGetterCallback<T, LocalOnly>;
    /**
     * This will be called with the value of the variable whenever a change is detected in the local cache
     * until the callback returns something different than `true`.
     *
     */
    poll?: VariablePollCallback<T>;
} & Pick<VariableGetRequest, "passive"> & VariableCacheSettings;
type ClientVariableSetter<T extends {} = any, LocalOnly extends boolean = boolean> = ClientScoped<VariableSetter<T>, LocalOnly> & {
    callback?: ClientVariableSetterCallback<T, LocalOnly>;
};
type ClientVariableGetResult<T extends {} = any, LocalOnly extends boolean = boolean> = ClientScoped<VariableResultPromiseResult<"get", VariableGetResult<T>> & Pick<VariableGetResponse, "passive">, LocalOnly>;
type ClientVariableSetResult<T extends {} = any, LocalOnly extends boolean = boolean> = ClientScoped<VariableResultPromiseResult<"set", VariableSetResult<T>>, LocalOnly>;
type ClientVariableGetterCallback<T extends {} = any, LocalOnly extends boolean = boolean> = VariableGetterCallback<ClientScoped<VariableKey, LocalOnly>, T>;
type ClientVariableSetterCallback<T extends {} = any, LocalOnly extends boolean = boolean> = VariableSetterCallback<ClientScoped<VariableKey, LocalOnly>, T>;
type VariableCacheSettings = {
    /**
     * The maximum number of milliseconds the value of this variable can be cached.
     * If omitted or `true` the default value of 3 seconds will be used.
     * `false` or 0 means the variable will not be cached.
     */
    cache?: number | boolean;
};
declare const maskEntityId: <T extends {
    scope: string;
    entityId?: string;
}>(key: T) => T & ClientScoped<VariableKey>;
declare const isLocalScopeKey: (key: {
    scope: string;
} | Nullish) => key is {
    scope: LocalVariableScope;
};
declare const variableKeyToString: <S extends ClientVariableKey | Nullish>(key: S) => MaybeNullish<string, S>;
declare const stringToVariableKey: (key: string) => ClientVariableKey;

type ListenerArgs<T = {}> = T & {
    tracker: Tracker;
    unsubscribe: () => void;
};
interface Listener {
    set?(key: string, value: any, args: ListenerArgs): void;
    post?(events: TrackedEvent[], args: ListenerArgs): void;
    refresh?(args: ListenerArgs): void;
    /**
     * Enables the listener to apply custom logic when a command is posted to the tracker.
     *
     * If this returns `true` it means the command has been handled. If no listener handles a command that is posted to the tracker, an error occurs.
     */
    command?(command: TrackerCommand, args: ListenerArgs): void;
}

/**
 * Defines a mapping from HTML element attributes to tags based on their names.
 *
 * Use `selector` to limit the scope.
 * This could be if you have included some external HTML with the interesting attribute `data-uuid` but don't want to bloat events because data-uuid is generally used for something uninteresting.
 * Not that this comes with a performance overhead, if you have many of these.
 *
 * Use `prefix` if you want a different tag prefix than the attribute name.
 *
 * The reason why it is a object with keys, is to organize rules by their purpose. It also allows disabling rules by setting a known rule ID to `false` or `undefined`.
 */
type TagMappings = Record<string, MaybeArray<ParsableRegExp | {
    selector?: string;
    prefix?: string;
    match: ParsableRegExp;
}>>;
/**
 * Tracker configuration.
 */
interface TrackerClientConfiguration {
    /**
     * The name of the global variable used for tracking.
     *
     * @default tail
     */
    name?: string;
    /**
     * Flag to disable all tracking.
     */
    disabled?: boolean;
    /**
     * The URL to the tracker script
     */
    src: string;
    /**
     * If false events will be triggered but not posted.
     * This especially makes sense in a staging/preview environment where events can be debugged but does not affect analytics reporting.
     * @default true
     */
    postEvents?: boolean;
    /**
     * How often queued events should be posted (ms).
     *
     * @default 2000
     */
    postFrequency?: number;
    /**
     * How long time to wait before a request is considered timed out (ms).
     * This influences the global request mutex that prevents multiple requests to happen at the same time.
     *
     * @default 5000
     */
    requestTimeout?: number;
    /**
     * The minimum duration (ms) a component needs to be visible before it counts as an impression.
     *
     * @default 1000
     */
    impressionThreshold?: number;
    /**
     * Whether tabs opened via the right-click context menu should be tracked.
     * Be aware this will rewrite the links if the user decides to copy the link to the clipboard from said menu.
     *
     * If anyone but the the user follows the link, it will just be a redirect and not set any cookies whatsoever.
     *
     * @default true
     */
    captureContextMenu?: boolean;
    /**
     * Inter-tab communication and communication with the server will be encrypted using this key.
     *
     * This is optional.
     */
    encryptionKey?: string | Nullish;
    /**
     * A key that locks down the tracker API from external access.
     *
     * When specified, it must be added as a property to all commands that goes through `push`.
     */
    key?: string | Nullish;
    /**
     * If tail.js is hosted in a multi-tenant setup you know what to do.
     * Otherwise, leave this blank.
     */
    apiKey?: string | Nullish;
    /**
     * Defines which `data-*` attributes in the surrounding DOM that gets mapped to tags (in addition to `track-tags`).
     *
     * Rules without at least an include or exclude rule are ignored, and
     * rules with selectors are evaluated first.
     *
     * The default is to include data-* attributes where the name ends with "id" or "name".
     *
     * Use an empty array to exclude all data attributes.
     *
     */
    tags?: TagMappings;
    /**
     * Use JSON instead of LFSR encrypted MessagePack. This should only be set for debugging purposes
     * since it enables fingerprinting.
     *
     * This is controlled by the request handler's configuration and cannot be set independently.
     */
    json?: boolean;
    /** These attributes will be added to scripts to avoid CMP/script blockers to prevent them from executing. */
    scriptBlockerAttributes?: Record<string, string>;
    /** Default tracking settings. */
    defaultTracking?: TrackingBehavior;
}

type TrackerExtension = {
    /**
     * Optionally adds extra properties to events before they are posted.
     * If this returns false the event is skipped, and extensions after this one will not see the event.
     */
    decorate?(eventData: TrackedEvent): void | boolean;
    /**
     * Optionally implements custom logic in response to a command.
     * Returning `true` indicates that the extension handled the command.
     *
     * If no extensions processed the command, an error occurs.
     */
    processCommand?(command: TrackerCommand): boolean;
};
type TrackerExtensionFactory = {
    readonly id: string;
    setup(tracker: Tracker): TrackerExtension | void;
};

/***
 * Attributes that can be added to HTML elements to extend tracking.
 * `track-tags`, `track-clicks` and `track-button` can also be set via css properties as `--track-tags`, `--track-button` and `--track-clicks` respectively.
 */
interface TrackerAttributes {
    /**
     * The DOM element represents a layout area where components are inserted.
     */
    ["data-track-area"]?: TrackingBoundaryData["area"];
    /**
     * The DOM element represents a component
     */
    ["data-track-component"]?: string | TrackingBoundaryData["components"];
    /**
     * The DOM element represents a container for content.
     */
    ["data-track-content"]?: TrackingBoundaryData["content"];
    /**
     * These tags will be added to user activations with this DOM element or any of its descendants.
     */
    ["data-track-tags"]?: ParsableTags;
    /**
     * Track clicks on this DOM element as if it was a button (clicks are tracked by default for A and BUTTON elements).
     * If the `track-cart` attribute is present the element is already assumed to be a button.
     */
    ["data-track-button"]?: boolean | 0 | 1 | "";
    /**
     * An element with this attribute modifies the cart.
     * If not an object it is shorthand for the {@link CartCommandParameters.action} property where `true` or the empty string means `add`.
     */
    ["data-track-cart"]?: "" | true | CartAction | CartEventData;
    /**
     * Whether clicks are tracked or not.
     * This needs to be set to `true` on links and buttons rendered from server-side React components
     * if the tracker context should be included in the click events.
     */
    ["data-track-clicks"]?: boolean;
    /**
     * Corresponds to setting {@link TrackingBehavior.forms}.
     */
    ["data-track-form"]?: boolean;
    /**
     * Corresponds to setting {@link TrackingBehavior.formFields.values}.
     */
    ["data-track-field"]?: FormFieldTrackingLevel;
    /**
     * Corresponds to setting {@link TrackingBehavior.formFields.privacy}.
     */
    ["data-track-field-privacy"]?: DataClassification;
}

declare const detectDeviceType: () => Pick<UserAgentEvent, "deviceType" | "screen">;

declare const postUserAgentEvent: (tracker: Tracker) => void;

declare const getElementInfo: (el: Element, includeRect?: boolean) => {
    tagName: string;
    text: string;
    className: string | undefined;
    href: any;
    rect: _tailjs_types.Rectangle | undefined;
};
declare const userInteraction: TrackerExtensionFactory;

declare let currentViewEvent: ViewEvent | undefined;
declare const getCurrentViewId: () => string | undefined;
declare const pushNavigationSource: (navigationEventId: LocalID, consumed?: () => void) => void;
declare const getVisibleDuration: () => number;
declare const addViewChangedListener: (listener: _tailjs_util.Listener<[viewEvent: ViewEvent]>, triggerCurrent?: boolean) => _tailjs_util.Binders;

type ViewDurationTimer = (toggle?: boolean, reset?: boolean) => ViewTimingData;
declare const createViewDurationTimer: (started?: boolean) => ViewDurationTimer;
declare const getViewTimeOffset: () => ViewTimingData;
declare const addFrameListenerInternal: (listener: _tailjs_util.Listener<[frame: HTMLIFrameElement]>, triggerCurrent?: boolean) => _tailjs_util.Binders;
declare const onFrame: typeof addFrameListenerInternal;
declare const context: TrackerExtensionFactory;

declare const parseCartEventData: (data: boolean | string | CartEventData | Nullish) => CartEventData | undefined;
declare function tryGetCartEventData(sourceElement: Element): CartEventData | undefined;
declare const commerce: TrackerExtensionFactory;

type ActivatedDomComponent = ConfiguredComponent & ActivatedComponent;
declare const componentDomConfiguration: unique symbol;
declare const checkTrackingEnabled: (el: NodeWithParentElement | Nullish) => boolean;
type ComponentContext = {
    components?: ActivatedComponent[];
    content?: ActivatedContent[];
    area?: string;
    tags?: Tag[];
};
type GetComponentContextSettings = {
    directOnly?: boolean | Nullish;
    includeRegion?: boolean | Nullish;
    eventType?: string | Nullish;
    previous?: ComponentContext & Record<keyof any, unknown>;
};
declare const getComponentContext: (el: NodeWithParentElement, { directOnly, includeRegion, eventType, previous, }?: GetComponentContextSettings) => ComponentContext | undefined;
declare const components: TrackerExtensionFactory;

declare const scroll: TrackerExtensionFactory;

declare const forms: TrackerExtensionFactory;

declare const consent: TrackerExtensionFactory;

declare const defaultExtensions: TrackerExtensionFactory[];

type TrackEventCommand = Omit<TrackedEvent, "id"> & {
    id?: string;
} & (Record<keyof any, unknown> | {});
type TrackerCommand = (TrackEventCommand | TrackEventCommand[] | FlushCommand | GetCommand | SetCommand | ListenerCommand | ExtensionCommand | TagAttributesCommand | ToggleCommand | ViewCommand | TrackingBoundaryDataCommand | ChangeUserCommand | CartCommand | OrderCommand | FormCommand | ConsentCommand | UseTrackerCommand | ConfigurationCommand) & UnlockApiCommand;
type UnlockApiCommand = {
    key?: string | Nullish;
};

/**
 * Triggers events related to a shopping cart.
 */
interface CartCommand {
    cart: "clear" | CartEventData;
}
declare const isCartCommand: (command: any) => command is CartCommand;

interface ChangeUserCommand {
    username: string | Nullish;
}
declare const isChangeUserCommand: (command: any) => command is ChangeUserCommand;

type TagAttributesCommand = {
    tagAttributes: TagMappings;
};
declare const isTagAttributesCommand: (command: any) => command is TagAttributesCommand;

/**
 * Enables or disables tracking.
 */
type ToggleCommand = {
    disable: boolean;
};
declare const isToggleCommand: (command: any) => command is ToggleCommand;

/**
 * Registers an element as the boundary for a component or similar tracking data. All events triggered from the element or its descendants will have this information attached.
 * In case of nested boundaries the closest one is used.
 */
type TrackingBoundaryDataCommand = {
    boundary: Element;
} & ({
    /** Remove all boundary data from the element from all {@link layer}s. */
    clear: boolean;
    layer?: never;
} | ({
    /**
     * Used to avoid conflicts between different logic that provides boundary data for the same element.
     * The default is that all exiting boundary data for the element gets replaced, but this key allows you
     * to only replace the data related to some specific logic.
     *
     * The different layers gets merged after each update.
     */
    layer?: string | symbol;
} & ((TrackingBoundaryData & {
    update?: never;
}) | {
    update: (current?: TrackingBoundaryData<true>) => TrackingBoundaryData | Nullish;
})));
declare const isTrackingDataCommand: (command: any) => command is TrackingBoundaryDataCommand;

interface ExtensionCommand {
    extension: TrackerExtensionFactory;
    priority?: number;
}
declare const isExtensionCommand: (command: any) => command is ExtensionCommand;

/**
 * Causes all queued events to be posted to the server immediately.
 */
type FlushCommand = {
    flush: boolean;
    force?: boolean;
    defer?: boolean;
};
declare const isFlushCommand: (command: any) => command is FlushCommand;

type FormCommandAction = "submit" | "validation-error";
/**
 * Use this command if you have custom validation logic or submit logic that does not get detected automatically by tail.js.
 * If no element reference is explicitly provided, the currently submitting form is assumed.
 *
 * This command is only valid while a form is submitting (the form's "submit" event has been triggered),
 * or a reference is specified for a form where the user has started filling it.
 */
type FormCommand = {
    form: FormCommandAction;
    ref?: HTMLFormElement | {
        target: EventTarget;
    };
};
declare const isFormCommand: (command: any) => command is FormCommand;

/**
 * Used to get variables (data) from the backend.
 */
interface GetCommand {
    get: MaybeArray<PickRequired<ClientVariableGetter, "callback">>;
}
declare const isGetCommand: (command: any) => command is GetCommand;

/**
 * Registers a listener that will be invoked before and after events are flushed.
 * Useful for debugging or client-side integration with other tracker libraries (if one absolutely must).
 */
interface ListenerCommand {
    listener: Listener;
}
declare const isListenerCommand: (command: any) => command is ListenerCommand;

/**
 * Shorthand command to trigger an {@link OrderEvent} event.
 */
interface OrderCommand {
    /**
     * The order that was completed or cancelled.
     */
    order: Order;
}
declare const isOrderCommand: (command: any) => command is OrderCommand;

type ComponentOrContent = {
    component: Component;
} | {
    content: ExternalReference;
};
/**
 * Registers an element as the boundary for a component. All events triggered from the element or its descendants will have this information attached.
 * In case of nested boundaries the closest one is used.
 */
interface ScanComponentsCommand {
    scan: {
        attribute: string;
        components: ComponentOrContent[];
    };
}
declare const isScanComponentsCommand: (command: any) => command is ScanComponentsCommand;

/**
 * Used to set variables (data) in the backend.
 */
interface SetCommand {
    /** An object where the names of the properties correspond to the variables set in the tracker. */
    set: MaybeArray<ClientVariableSetter>;
}
declare const isSetCommand: (command: any) => command is SetCommand;

type UseTrackerCommand = (tracker: Tracker) => void;
declare const isTrackerAvailableCommand: (command: TrackerCommand) => command is (tracker: Tracker) => void;

/**
 * Triggers a manual {@link ViewEvent} (or patches the current) with the view context set to the specified value.
 */
interface ViewCommand {
    view: CurrentView | BoundaryDataView | undefined;
}
declare const isViewCommand: (command: any) => command is ViewCommand;

type ExternalConsentPoller = (current: UserConsent | undefined) => UserConsent | undefined;
/** Return `true` if you want this callback invoked every time the consent changes, and not just once. */
type ConsentCallback = (consent: UserConsent, previous: UserConsent | undefined) => MaybePromiseLike<boolean | undefined | void>;
/** Gets or updates the user's consent. */
interface ConsentCommand {
    consent: {
        get?: ConsentCallback;
        set?: UserConsent | {
            consent: UserConsent;
            callback?: (updated: boolean, current: UserConsent | undefined) => void;
        };
        /**
         * This can be used to poll the client's browser environment for something that translates into a tail.js consent.
         * The primary use case is to integrate with a CMP (e.g. Cookiebot).
         *
         * Please provide a unique key for the poll function to avoid unintended double polling if for some reason
         * the command is unintentionally submitted more than once.
         */
        externalSource?: {
            key: string;
            poll: ExternalConsentPoller;
            /** @default 1000 */
            frequency?: number;
        };
    };
}
declare const isUpdateConsentCommand: (command: any) => command is ConsentCommand;

type ConfigurationCommand = {
    track: TrackingBehavior;
};
declare const isConfigurationCommand: (command: any) => command is ConfigurationCommand;

declare let tracker: Tracker;
declare const initializeTracker: (config: TrackerClientConfiguration | string) => Tracker | undefined;

export { type ActivatedDomComponent, type AnyVariableScope, type CartCommand, type ChangeUserCommand, type ClientScoped, type ClientVariable, type ClientVariableGetResult, type ClientVariableGetter, type ClientVariableGetterCallback, type ClientVariableKey, type ClientVariableSetResult, type ClientVariableSetter, type ClientVariableSetterCallback, type ComponentContext, type ComponentOrContent, type ConfigurationCommand, type ConsentCallback, type ConsentCommand, type CurrentView, type ExtensionCommand, type ExternalConsentPoller, type FlushCommand, type FormCommand, type FormCommandAction, type GetCommand, type GetComponentContextSettings, type Listener, type ListenerArgs, type ListenerCommand, type LocalVariableScope, type OrderCommand, type ProvisionalTracker, type ReferringViewData, type ReservedTrackerVariables, type ScanComponentsCommand, type SetCommand, type TagAttributesCommand, type TagMappings, type ToggleCommand, type TrackEventCommand, type Tracker, type TrackerAttributes, type TrackerClientConfiguration, type TrackerCommand, type TrackerExtension, type TrackerExtensionFactory, type TrackingBoundaryDataCommand, type UnlockApiCommand, type UseTrackerCommand, type VariableCacheSettings, type ViewCommand, type ViewDurationTimer, addViewChangedListener, anyVariableScope, checkTrackingEnabled, commerce, componentDomConfiguration, components, consent, context, createViewDurationTimer, currentViewEvent, defaultExtensions, detectDeviceType, forms, getComponentContext, getCurrentViewId, getElementInfo, getViewTimeOffset, getVisibleDuration, initializeTracker, isCartCommand, isChangeUserCommand, isConfigurationCommand, isExtensionCommand, isFlushCommand, isFormCommand, isGetCommand, isListenerCommand, isLocalScopeKey, isOrderCommand, isScanComponentsCommand, isSetCommand, isTagAttributesCommand, isToggleCommand, isTrackerAvailableCommand, isTrackingDataCommand, isUpdateConsentCommand, isViewCommand, localVariableScope, maskEntityId, onFrame, parseCartEventData, postUserAgentEvent, pushNavigationSource, scroll, stringToVariableKey, tracker, tryGetCartEventData, userInteraction, variableKeyToString };
