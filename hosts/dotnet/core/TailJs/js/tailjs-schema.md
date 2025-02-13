
# Events

## TrackedEvent {#type--urn-tailjs-core-TrackedEvent}
*Extends*: [Tagged](#type--urn-tailjs-core-Tagged)
*purposes*: necessary

The base type for all events that are tracked.

The naming convention is:
- If the event represents something that can also be considered an entity like a "page view", "user location" etc. the name should be that.
- If the event indicates something that happened, like "session started", "view ended" etc. the name should end with a verb in the past tense.

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|type|string|||The type name of the event.<br><br>All concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.<br><br>Since this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.|
|schema|string|||The ID of the schema the event comes from. It is suggested that the schema ID includes a SemVer version number in the end. (e.g. urn:tailjs:0.9.0 or https://www.blah.ge/schema/3.21.0)|
|id|string|||This is assigned by the server. Only use` clientId ` client-side.|
|timestamp|timestamp|||If specified, it must be a negative number when sent from the client (difference between when the event was generated and when is was posted in milliseconds).<br><br>The timestamp is assigned before it reaches a backend.|
|clientId|string|||An identifier that is locally unique to some scope.|
|patchTargetId|string|||An identifier that is locally unique to some scope.|
|relatedEventId|string|||An identifier that is locally unique to some scope.|
|view|string|||An identifier that is locally unique to some scope.|
|metadata|[EventMetadata](#type--urn-tailjs-core-EventMetadata)|||These properties are used to track the state of the event as it gets collected, and is not persisted.|
|session|[Session](#type--urn-tailjs-core-Session)|||The session associated with the event.|

## AuthenticationEvent {#type--urn-tailjs-core-AuthenticationEvent}
*Extends*: [TrackedEvent](#type--urn-tailjs-core-TrackedEvent)
*purposes*: necessary

Events related to users signing in, out etc..

## CommerceEvent {#type--urn-tailjs-core-CommerceEvent}
*Extends*: [TrackedEvent](#type--urn-tailjs-core-TrackedEvent)
*purposes*: necessary

## ConsentEvent {#type--urn-tailjs-core-ConsentEvent}
*Extends*: [TrackedEvent](#type--urn-tailjs-core-TrackedEvent)
*purposes*: necessary

The event that indicates whether a user has opted in to non-essential tracking used for purposes beyond non-personal, aggregated statistics or the storage of this consent itself.

This event has a significant effect throughout the system since the lack of consent to non-essential tracking will prevent all non-essential cookies and identifiers to ever reach the user's device. In the same way, such information is cleared if the user opts out.

Backends are expected to respect this consent, yet IT IS NOT THE RESPONSIBILITY OF tailjs.JS TO ENFORCE IT since it has no way to know the domain context of the data it relays.

The user's decision is stored in an essential cookie and updated accordingly with this event. Sending the event with` nonEssentialTracking ` `false` revokes the consent if already given. The event should ideally be sent from a cookie disclaimer.

Granular consents to email marketing, external advertising and the like must be handled by other mechanisms than tracking events. This event only ensures that non-essential tracking information is not stored at the user unless consent is given.

Also, "consent" and "event" rhymes.

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|type|string|||The type name of the event.<br><br>All concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.<br><br>Since this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.|
|consent|[UserConsent](#type--urn-tailjs-core-UserConsent)||||

## OrderCancelledEvent {#type--urn-tailjs-core-OrderCancelledEvent}
*Extends*: [TrackedEvent](#type--urn-tailjs-core-TrackedEvent)
*purposes*: necessary

An order was cancelled.

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|type|string|||The type name of the event.<br><br>All concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.<br><br>Since this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.|
|cancelledByUser|boolean|||Indicates if the user cancelled the order or it happended during a background process.|

## OrderCompletedEvent {#type--urn-tailjs-core-OrderCompletedEvent}
*Extends*: [TrackedEvent](#type--urn-tailjs-core-TrackedEvent)
*purposes*: necessary

An order was cancelled.

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|type|string|||The type name of the event.<br><br>All concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.<br><br>Since this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.|

## OrderConfirmedEvent {#type--urn-tailjs-core-OrderConfirmedEvent}
*Extends*: [TrackedEvent](#type--urn-tailjs-core-TrackedEvent)
*purposes*: necessary

An order was accepted.

This may be useful to track if some backend system needs to validate if the order submitted by the user is possible, or just for monitoring whether your site is healthy and actually processes the orders that come in.

This event should also imply that the user got a confirmation.

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|type|string|||The type name of the event.<br><br>All concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.<br><br>Since this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.|

## OrderStatusEvent {#type--urn-tailjs-core-OrderStatusEvent}
*Extends*: [TrackedEvent](#type--urn-tailjs-core-TrackedEvent)
*purposes*: necessary

Base event for events that related to an order changing status.

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|order|string|||A reference to the order that changed status.|

## SessionLocationEvent {#type--urn-tailjs-core-SessionLocationEvent}
*Extends*: [TrackedEvent](#type--urn-tailjs-core-TrackedEvent), [SessionScoped](#type--urn-tailjs-core-SessionScoped)
*purposes*: necessary

This event is triggered whenever the user's location changes.

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|type|string|||The type name of the event.<br><br>All concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.<br><br>Since this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.|
|accuracy|percentage|indirect|performance|Like the bars indicating signal strength on mobile phones - higher is better, yet nobody knows the exact definition.|
|zip|string|indirect|performance||
|lat|number|indirect|performance||
|lng|number|indirect|performance||
|continent|[GeoEntity](#type--urn-tailjs-core-GeoEntity)||performance|The continent is considered safe to store with anonymous tracking.|
|country|[GeoEntity](#type--urn-tailjs-core-GeoEntity)||performance|The country is considered safe to store with anonymous tracking.|
|subdivision|[GeoEntity](#type--urn-tailjs-core-GeoEntity)|indirect|performance||
|city|[GeoEntity](#type--urn-tailjs-core-GeoEntity)|indirect|performance||

## SessionStartedEvent {#type--urn-tailjs-core-SessionStartedEvent}
*Extends*: [TrackedEvent](#type--urn-tailjs-core-TrackedEvent)
*purposes*: necessary

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|type|string|||The type name of the event.<br><br>All concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.<br><br>Since this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.|
|url|string||||
|sessionNumber|integer|||The total number of sessions from the given device (regardless of username).|
|timeSinceLastSession|duration|||The time since the last session from this device.|

## SystemEvent {#type--urn-tailjs-core-SystemEvent}
*Extends*: [TrackedEvent](#type--urn-tailjs-core-TrackedEvent)
*purposes*: necessary

Events implementing this interface are supporting the infrastructure and should not appear in BI/analytics.

## UserAgentEvent {#type--urn-tailjs-core-UserAgentEvent}
*Extends*: [TrackedEvent](#type--urn-tailjs-core-TrackedEvent), [SessionScoped](#type--urn-tailjs-core-SessionScoped)
*purposes*: necessary

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|type|string|||The type name of the event.<br><br>All concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.<br><br>Since this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.|
|hasTouch|boolean|||Has touch|
|deviceType|string|||The device type (inferred from screen size). The assumption is: - anything width a logical device pixel width less than 480 is a phone, - anything with a logical device pixel width less than or equal to 1024 (iPad Pro12.9") is a tablet, - the rest are desktops.<br><br>Device width is the physical width of the device regardless of its orientation.|
|userAgent|string|||User agent string|
|languages|Array\<[UserAgentLanguage](#type--urn-tailjs-core-UserAgentLanguage)\>|||The user's language preferences as configured in the user's device.|
|timezone|[UserAgentEvent_timezone_type](#type--urn-tailjs-core-UserAgentEvent_timezone_type)||||
|screen|[UserAgentEvent_screen_type](#type--urn-tailjs-core-UserAgentEvent_screen_type)|||Screen|

## UserInteractionEvent {#type--urn-tailjs-core-UserInteractionEvent}
*Extends*: [TrackedEvent](#type--urn-tailjs-core-TrackedEvent)
*purposes*: necessary

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|components|Array\<[ActivatedComponent](#type--urn-tailjs-core-ActivatedComponent)\>|||Relevant components and content in the scope of the activated element.|
|area|string|||An optional name of the area of the page (i.e. in the DOM) where the component is rendered. By convention this should the path of nested content areas separated by a slash.|
|timeOffset|[ViewTimingData](#type--urn-tailjs-core-ViewTimingData)|||The time the event happened relative to the view were it was generated.|
|pos|[ScreenPosition](#type--urn-tailjs-core-ScreenPosition)|||The position where the user clicked / activation occurred relative to the document top as a percentage of the entire document height (not visible viewport if scrolled).|
|viewport|[Viewport](#type--urn-tailjs-core-Viewport)|||The viewport of the user's browser when the event happened.|
|element|[ElementInfo](#type--urn-tailjs-core-ElementInfo)|||Information about the activated element, if any.|

## ViewEvent {#type--urn-tailjs-core-ViewEvent}
*Extends*: [TrackedEvent](#type--urn-tailjs-core-TrackedEvent)
*purposes*: necessary

This event is sent a user navigates between views. (page, screen or similar).

This event does not

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|type|string|||The type name of the event.<br><br>All concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.<br><br>Since this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.|
|clientId|string|||An identifier that is locally unique to some scope.|
|tab|string|||An identifier that is locally unique to some scope.|
|href|string|||The fully qualified URL as shown in the address line of the browser excluding the domain.|
|hash|string|||The hash part of the URL (/about-us#address).|
|path|string|||The path portion of the URL.|
|duration|[ViewTimingData](#type--urn-tailjs-core-ViewTimingData)|||For how long the view was active. This is set via patches|
|httpStatus|number|||The HTTP status for the response associated with the view.|
|utm|[ViewEvent_utm_type](#type--urn-tailjs-core-ViewEvent_utm_type)|||Urchin Tracking Module (UTM) parameters as defined by (Wikipedia)[https://en.wikipedia.org/wiki/UTM_parameters].|
|queryString|Map\<string, Array\<string\>\>|||The query string parameters in the URL, e.g. utm_campaign. Each parameter can have multiple values, for example If the parameter is specified more than once. If the parameter is only specified once pipes, semicolons and commas are assumed to separate values (in that order). A parameter without a value will get recorded as an empty string.|
|domain|[Domain](#type--urn-tailjs-core-Domain)|||The domain part of the href, if any.|
|landingPage|boolean|||Indicates that this was the first view in the first tab the user opened. Note that this is NOT tied to the session. If a user closes all tabs and windows for the site and then later navigates back to the site in the same session this flag will be set again.|
|firstTab|boolean|||Indicates that no other tabs were open when the view happened. This flag allows a backend to extend the definition of a session that can last indefinitely but still restart after inactivity. By measuring the time between a view with this flag and the previous event from the same device, it is possible to see for how long the device has been away from the site.|
|tabNumber|integer|||The tab number in the current session.|
|tabViewNumber|integer|||The view number in the current tab. This is kept as a convenience, yet technically redundant since it follows from timestamps and context.|
|redirects|integer|||Number of redirects that happened during navigation to this view.|
|navigationType|string|||Navigation type.|
|mode|string|||Indicates whether the event was manually triggered through a tracker command, or happened automatically by the tracker's ability to infer navigation.|
|externalReferrer|[ViewEvent_externalReferrer_type](#type--urn-tailjs-core-ViewEvent_externalReferrer_type)|||External referrer. Internal referrers follows from the event's` TrackedEvent ["relatedView"] ` field.|
|viewport|[Viewport](#type--urn-tailjs-core-Viewport)|||The size of the user's viewport (e.g. browser window) and how much it was scrolled when the page was opened.|
|viewType|string|||The type of view, e.g. "page" or "screen".|
|definition|[View](#type--urn-tailjs-core-View)|||The primary content used to generate the view including the personalization that led to the decision, if any. If views are loaded asynchronously in a way where they are not available immediately after a user navigates to a URL on the website, the view definition may follow from a separate patch event.|

## SignInEvent {#type--urn-tailjs-core-SignInEvent}
*Extends*: [AuthenticationEvent](#type--urn-tailjs-core-AuthenticationEvent)
*purposes*: necessary

A user signed in.

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|type|string|||The type name of the event.<br><br>All concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.<br><br>Since this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.|
|userId|string|||The user that signed in.|
|evidence|string|||Custom data that can be used to validate the login server-side to make sure that userdata cannot get hijacked by abusing the API.|

## SignOutEvent {#type--urn-tailjs-core-SignOutEvent}
*Extends*: [AuthenticationEvent](#type--urn-tailjs-core-AuthenticationEvent)
*purposes*: necessary

A user actively signed out. (Session expiry doesn't count).

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|type|string|||The type name of the event.<br><br>All concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.<br><br>Since this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.|
|userId|string|||The user that signed out.|

## CartAbandonedEvent {#type--urn-tailjs-core-CartAbandonedEvent}
*Extends*: [CommerceEvent](#type--urn-tailjs-core-CommerceEvent), [Order](#type--urn-tailjs-core-Order)
*purposes*: necessary

The shopping cart was abandoned. Currently there is no logic in the tracker to trigger this event automatically, hence a custom trigger must be implemented.

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|type|string|||The type name of the event.<br><br>All concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.<br><br>Since this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.|
|lastCartEvent|timestamp|||The timestamp for the last time the shopping cart was modified by the user before abandonment.|

## OrderEvent {#type--urn-tailjs-core-OrderEvent}
*Extends*: [CommerceEvent](#type--urn-tailjs-core-CommerceEvent), [Order](#type--urn-tailjs-core-Order)
*purposes*: necessary

An order submitted by a user.

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|type|string|||The type name of the event.<br><br>All concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.<br><br>Since this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.|

## PaymentEvent {#type--urn-tailjs-core-PaymentEvent}
*Extends*: [CommerceEvent](#type--urn-tailjs-core-CommerceEvent)
*purposes*: necessary

Events related to order payments.

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|orderReference|string|||The reference to order for which payment was made, either` Order.orderId ` or` Order.internalId ` .|
|amount|decimal|||The amount paid.|
|paymentMethod|string|||A domain specific value for the payment method.|
|currency|string|||The currency of the payment.|

## ResetEvent {#type--urn-tailjs-core-ResetEvent}
*Extends*: [TrackedEvent](#type--urn-tailjs-core-TrackedEvent), [SystemEvent](#type--urn-tailjs-core-SystemEvent)
*purposes*: necessary

An event that can be used to reset the current session and optionally also device. Intended for debugging and not relayed to backends.

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|type|string|||The type name of the event.<br><br>All concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.<br><br>Since this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.|
|includeDevice|boolean|||Whether only the session or also the device should be reset.|
|includeConsent|boolean|||Whether to also reset the consent.|

## AnchorNavigationEvent {#type--urn-tailjs-core-AnchorNavigationEvent}
*Extends*: [UserInteractionEvent](#type--urn-tailjs-core-UserInteractionEvent)
*purposes*: necessary

The event that is triggered when a page scroll to a specific section based on an anchor in the URL (e.g. /page#section-3)

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|type|string|||The type name of the event.<br><br>All concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.<br><br>Since this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.|
|anchor|string|||The name of the anchor.|

## CartUpdatedEvent {#type--urn-tailjs-core-CartUpdatedEvent}
*Extends*: [UserInteractionEvent](#type--urn-tailjs-core-UserInteractionEvent), [CommerceEvent](#type--urn-tailjs-core-CommerceEvent), [CartEventData](#type--urn-tailjs-core-CartEventData)
*purposes*: necessary

Indicates that a shopping cart was updated.

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|type|string|||The type name of the event.<br><br>All concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.<br><br>Since this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.|

## ComponentClickEvent {#type--urn-tailjs-core-ComponentClickEvent}
*Extends*: [UserInteractionEvent](#type--urn-tailjs-core-UserInteractionEvent)
*purposes*: necessary

The event is triggered when a component is clicked.

This applies only to components that have click tracking configured, either via` TrackingSettings.clicked ` , "track-clicks" in the containing DOM or "--track-clicks" via CSS.

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|type|string|||The type name of the event.<br><br>All concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.<br><br>Since this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.|

## ComponentClickIntentEvent {#type--urn-tailjs-core-ComponentClickIntentEvent}
*Extends*: [UserInteractionEvent](#type--urn-tailjs-core-UserInteractionEvent)
*purposes*: necessary

The event is triggered when a user probably wanted to click a component but nothing happened.

Used for UX purposes where it may indicate that navigation is not obvious to the users. This event is only triggered for components that contain navigation options (e.g. hyperlinks) and has click tracking enabled.

This applies only to components that have click tracking configured, either via` TrackingSettings.clicked ` , "track-clicks" in the containing DOM or "--track-clicks" via CSS.

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|type|string|||The type name of the event.<br><br>All concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.<br><br>Since this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.|
|clicks|Array\<[Position](#type--urn-tailjs-core-Position)\>||||
|clickables|Array\<[ComponentElementInfo](#type--urn-tailjs-core-ComponentElementInfo)\>||||

## ComponentViewEvent {#type--urn-tailjs-core-ComponentViewEvent}
*Extends*: [UserInteractionEvent](#type--urn-tailjs-core-UserInteractionEvent)
*purposes*: necessary

This event is triggered when the user scrolls a component into view if it is configured for this kind of tracking.

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|type|string|||The type name of the event.<br><br>All concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.<br><br>Since this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.|

## FormEvent {#type--urn-tailjs-core-FormEvent}
*Extends*: [UserInteractionEvent](#type--urn-tailjs-core-UserInteractionEvent)
*purposes*: necessary

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|type|string|||The type name of the event.<br><br>All concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.<br><br>Since this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.|
|name|string|||The name of the form that was submitted.|
|completed|boolean|||Indicates whether the form was completed (that is, submitted). If this is false it means that the form was abandoned.|
|activeTime|duration|||The duration the user was actively filling the form.|
|totalTime|duration|||The total duration from the user started filling out the form until completion or abandonment.|
|fields|Map\<string, [FormField](#type--urn-tailjs-core-FormField)\>|||All fields in the form (as detected).|
|ref|string|||A correlation ID. If a hidden input element has the name "_tailref", the HTML attribute "track-ref" or css variable "--track-ref: 1" its value will be used. If all of the above is difficult to inject in the way the form is embedded, the form element or any of its ancestors may alternatively have the HTML attribute "track-ref" with the name of the hidden input field that contains the reference.<br><br>If no initial value a unique one will be assigned. Make sure to store the value in receiving end.|

## ImpressionEvent {#type--urn-tailjs-core-ImpressionEvent}
*Extends*: [UserInteractionEvent](#type--urn-tailjs-core-UserInteractionEvent)
*purposes*: necessary

The event is triggered when more than 75 % of the component's has been visible for at least 1 second, or the component has taken up at least 33 % of the viewport width or height for at least 1 second, whichever comes first.


This only gets tracked for components that have impression tracking configured, either via` TrackingSettings.impressions ` , "track-impressions" in the containing DOM or "--track-impressions" via CSS.

Note that impression tracking cannot be configured via the DOM/CSS for secondary and inferred components since the number of these can be considerable and it would hurt performance. Impression tracking is still possible for these if explicitly set via` TrackingSettings.impressions ` .

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|type|string|||The type name of the event.<br><br>All concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.<br><br>Since this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.|
|impressions|integer|||The number of times the component was sufficiently visible to count as an impression. This counter will increment if the component leaves the user's viewport and then comes back.|
|duration|[ViewTimingData](#type--urn-tailjs-core-ViewTimingData)|||For how long the component was visible. This counter starts after an impression has been detected.|
|regions|[ImpressionEvent_regions_type](#type--urn-tailjs-core-ImpressionEvent_regions_type)|||Detailed information about the parts of the component that was viewed. This information is only provided if the component spans more than 125 % of the viewport's height.|
|text|[ImpressionTextStats](#type--urn-tailjs-core-ImpressionTextStats)|||The length and number of words in the component's text. This combined with the active time can give an indication of how much the user read if at all.|
|seen|percentage|||The percentage of the component's area that was visible at some point during the` View ` .|
|read|percentage|||The percentage of the text the user can reasonably be assumed to have read based on the number of words and duration of the impression.|

## NavigationEvent {#type--urn-tailjs-core-NavigationEvent}
*Extends*: [UserInteractionEvent](#type--urn-tailjs-core-UserInteractionEvent)
*purposes*: necessary

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|type|string|||The type name of the event.<br><br>All concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.<br><br>Since this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.|
|clientId|string|||An identifier that is locally unique to some scope.|
|href|string|||The destination URL of the navigation|
|exit|boolean|||Indicates that the user went away from the site to an external URL.|
|anchor|string|||The anchor specified in the href if any.|
|external|boolean|||Indicates that the navigation is to an external domain|
|self|boolean|||Whether the navigation happened in the current view or a new tab/window was opened.|
|domain|[Domain](#type--urn-tailjs-core-Domain)|||The domain of the destination|

## ScrollEvent {#type--urn-tailjs-core-ScrollEvent}
*Extends*: [UserInteractionEvent](#type--urn-tailjs-core-UserInteractionEvent)
*purposes*: necessary

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|type|string|||The type name of the event.<br><br>All concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.<br><br>Since this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.|
|offset|[ScreenPosition](#type--urn-tailjs-core-ScreenPosition)|||The offset relative to the page size (100 % is bottom, 0 % is top)|
|scrollType|string|||The type of scrolling.|

## SearchEvent {#type--urn-tailjs-core-SearchEvent}
*Extends*: [UserInteractionEvent](#type--urn-tailjs-core-UserInteractionEvent)
*purposes*: necessary

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|type|string|||The type name of the event.<br><br>All concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.<br><br>Since this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.|
|query|string|||The free-text query used for the search.|
|filters|Array\<[SearchFilter](#type--urn-tailjs-core-SearchFilter)\>|||Any filters that were applied to the search in addition to the query. Filters are assumed combined using "and" semantics unless they are for the same field in which case it means that the field must match at least one of the values.<br><br>For example "age\$1=10 AND age\$1=20 AND (type=horse OR type=cat)"|
|hits|integer|||The number of results that matched the query.|
|topHits|Array\<[SearchResult](#type--urn-tailjs-core-SearchResult)\>|||If some or all of the results are relevant for analytics or AI, they can be included here.|

## PaymentAcceptedEvent {#type--urn-tailjs-core-PaymentAcceptedEvent}
*Extends*: [PaymentEvent](#type--urn-tailjs-core-PaymentEvent)
*purposes*: necessary

The payment for an order was accepted.

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|type|string|||The type name of the event.<br><br>All concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.<br><br>Since this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.|
|finalPayment|boolean|||The payment was the final payment, hence completed the order.|

## PaymentRejectedEvent {#type--urn-tailjs-core-PaymentRejectedEvent}
*Extends*: [PaymentEvent](#type--urn-tailjs-core-PaymentEvent)
*purposes*: necessary

A payment for the order was rejected.

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|type|string|||The type name of the event.<br><br>All concrete event types must override this property with a constant value, and it is an error to try to store an event without a constant type.<br><br>Since this is a system property that is ignored during censoring per default, it automatically becomes anonymous and necessary in custom events without required properties unless the system annotation is explicitly repeated.|

# Other types

## ClickIds {#type--urn-tailjs-core-ClickIds}
*purposes*: necessary

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|google|string||||
|googleDoubleClick|string||||
|facebook|string||||
|microsoft|string||||
|googleAnalytics|string||||

## CommerceData {#type--urn-tailjs-core-CommerceData}
*purposes*: necessary

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|price|decimal|||The unit price.|
|unit|string|||The unit the item is sold by.|
|currency|string|||The currency of the price. This field does not have a default value; if unspecified it must be assumed from context.|
|variation|[ExternalReference](#type--urn-tailjs-core-ExternalReference)|||The specific variant of the content if the item sold comes in different variations (e.g. red/green/purple).|
|stock|number|||The current number of units in stock.<br><br>Use fixed integer values if you do not want to reveal the actual stock, e.g. (0 = none, 10 = few, 100 = many).|

## DataPurposes {#type--urn-tailjs-core-DataPurposes}
*purposes*: necessary

The purposes data can be used for. Non-necessary data requires an individual's consent to be collected and used.

Data categorized as "anonymous" will be stored regardless of consent since a consent only relates to "personal data", and anonymous data is just "data".

Whether the two purposes "personalization" and "security" are considered separate purposes is configurable. The default is to consider "personalization" the same as "functionality", and "security" the same as "necessary".

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|performance|boolean|||Data stored for this purpose is used to gain insights on how individuals interact with a website or app optionally including demographics and similar traits with the purpose of optimizing the website or app.<br><br>DO NOT use this category if the data may be shared with third parties or otherwise used for targeted marketing outside the scope of the website or app. Use` DataPurposeFlags.Targeting ` instead.<br><br>It may be okay if the data is only used for different website and apps that relate to the same product or service. This would be the case if an individual is able to use an app and website interchangeably for the same service. Different areas of a brand may also be distributed across multiple domain names.|
|functionality|boolean|||Data stored for this purpose is used for settings that adjust the appearance of a website or app according to an individual's preferences such as "dark mode" or localization of date and number formatting.<br><br>Depending on your configuration, a functionality consent may also include personalization. Personalization such as suggested articles and videos is per definition functionality, but a special subcategory may be used to make the distinction between profile settings and behavioral history depending on your requirements.<br><br>DO NOT use this category if the data may be shared with third parties or otherwise used for targeted marketing outside the scope of the website or app. Use` DataPurposeFlags.Marketing ` instead.<br><br>It may be okay if the data is only used for different website and apps that relate to the same product, brand or service, hence the information is still "first party" with respect to the legal entity/brand to whom the consent is made.<br><br>This would be the case if an individual is able to use an app and website interchangeably for the same service. Different areas of a brand may also be distributed across multiple domain names.|
|marketing|boolean|||Data stored for this purpose may be similar to both functionality and performance data, however it may be shared with third parties or otherwise used to perform marketing outside the scope of the specific website or app.<br><br>When tagging data points in a schema it is good practice to also specify whether the data is related to performance, functionality or both<br><br>If the data is only used for different websites and apps that relate to the same product or service that belongs to your brand, it might not be necessary to use this category.|
|personalization|boolean|||Personalization is a special subcategory of functionality data that is for things such as recommending articles and videos. This purpose is per default synonymous with` DataPurposes.functionality ` , but can be configured to be a separate purpose that requires its own consent.|
|security|boolean|||Data stored for this purpose is related to security such as authentication, fraud prevention, and other user protection.<br><br>This purpose is per default synonymous with` DataPurposes.essential ` but can be configured to be a separate purpose that requires its own consent.|

## DataUsage {#type--urn-tailjs-core-DataUsage}
*purposes*: necessary

The combination of the classification and purposes it can be used for determines whether data can be stored or used when compared to an individual's consent.

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|classification|string|||The maximum classification of data a user has consented to be collected and stored.<br><br>Any property with a classification higher than this will be cleared (censored) before an object is stored. If all properties gets censored, the object is not stored at all.<br><br>Anonymous data does not require active consent, so data is stored regardless of its purposes since it is not "personal data" but just "data". This means you should not annotate all anonymous data as "necessary" in your schema, but rather use the purpose(s) that would require consent had the data not been anonymous.<br><br>In this way you can simply remove the `anonymous` annotation from a field or object if it turns out it is not truly anonymous. After that the data can no longer be read for purposes without user consent. However, tail.js does not currently support redacting/purging the data from storage so this you need to do manually.<br><br>For schema definitions see` SchemaDataUsage ` for inheritance rules.|
|purposes|[DataPurposes](#type--urn-tailjs-core-DataPurposes)|||The purposes the data may be used for.<br><br>If a data point has multiple purposes, consent is only need for one of them for the data to get stored. However, if some logic tries to read the data for a purpose without consent, it is not returned, since it is only stored for other purposes.<br><br>Purposes do not restrict anonymous data. If no purposes are explicitly specified it implies "necessary".<br><br>For schema definitions see` SchemaDataUsage ` for inheritance rules.|

## Domain {#type--urn-tailjs-core-Domain}
*purposes*: necessary

Represents a domain name, e.g. https://www.foo.co.uk

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|scheme|string||||
|host|string||||

## ElementInfo {#type--urn-tailjs-core-ElementInfo}
*purposes*: necessary

Basic information about an HTML element.

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|tagName|string|||The tag name of the activated element.|
|text|string|||The textual content of the element that was clicked (e.g. the label on a button, or the alt text of an image)|
|href|string|||The target of the link, if any.|
|rect|[Rectangle](#type--urn-tailjs-core-Rectangle)||||

## EventMetadata {#type--urn-tailjs-core-EventMetadata}
*purposes*: necessary

These properties are used to track the state of events as they get collected, and not stored.

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|passive|boolean|||Hint to the request handler that new sessions should not be started if all posted events are passive.|
|queued|boolean|||Hint that the event has been queued.|
|posted|boolean|||Hint to client code, that the event has been posted to the server.|

## ExternalReference {#type--urn-tailjs-core-ExternalReference}
*purposes*: necessary

Represent a reference to externally defined data.

Have in mind that the reference does not need to point to an external system or database. It can just as well be a named reference to a React component, the value of a MV test variable or event just some hard-coded value.

The tailjs model generally prefers using external references rather than simple strings for most properties since that gives you the option to collect structured data that integrates well in, say, BI scenarios.

The tenet is that if you only use an URL from a web page, or the name of a campaign you will lose the ability to easily track these historically if/when they change. Even when correctly referencing a immutable ID you might still want to include the name to make it possible to add labels in your analytics reporting without integrating additional data sources. The names may then still be wrong after some time, but at least then you have the IDs data does not get lost, and you have a path for correcting it.

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|id|string|||The ID as defined by some external source, e.g. CMS.<br><br>The property is required but an empty string is permitted. The library itself uses the empty string to indicate an "empty" root component if a page has content that is not wrapped in a component.|
|version|string|||Optionally, the version of the item in case the external source supports versioning.|
|language|string|||Optionally, the language of the item in case the external source supports localization.|
|source|string|||Optionally, the ID of the external system referenced.|
|referenceType|string|||Optionally, how the item is referenced in case the external source supports multiple kinds of references, e.g. "parent" or "pointer".|
|isExternal|boolean|||Flag to indicate that this data comes from an external system that you do not control.|
|name|string|||Optionally, the name of the item at the time an event was recorded. Ideally, this should be retrieved from the source system when doing reporting to avoid inconsistent data and wasting space.|
|itemType|string|||Optionally, the type of item referenced. In CMS context this corresponds to "template". Ideally, this should be retrieved from the source system when doing reporting to avoid inconsistent data and wasting space.|
|path|string|||Optionally, the path of the item at the time the event was recorded. Ideally, this should be retrieved from the source system when doing reporting to avoid inconsistent data and wasting space.|

## ExternalUse {#type--urn-tailjs-core-ExternalUse}
*purposes*: necessary

Types and interfaces extending this marker interface directly must have a concrete type that can be instantiated in code-generation scenarios because they are referenced directly outside of the types package.

## FormField {#type--urn-tailjs-core-FormField}
*purposes*: necessary

A form field value in a` FormEvent ` .

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|id|string||||
|name|string|||The name of the form field.|
|label|string|||The label of the form field.|
|type|string|||The type of the input field.|
|filled|boolean|||If a user provided a value for the form field.<br><br>For checkboxes and prefilled drop-downs this is only set if the user changed the value (for checkboxes that is clicked them).|
|corrections|integer|||The number of times the field was changed after initially being filled.|
|activeTime|duration|||How long the user was active in the field (field had focus on active tab).|
|totalTime|duration|||How long the user was in the field (including if the user left the tab and came back).|
|value|string|direct||The value of the form field. Be careful with this one.<br><br>The default is only to track whether checkboxes are selected. Otherwise, field values are tracked if the boolean tracking variable `--track-form-values` is set in the input field's scope.|
|fillOrder|integer|||This field's number in the order the form was filled. A field is "filled" the first time the user types something in it.<br><br>If a checkbox or pre-filled drop down is left unchanged it will not get assigned a number.|
|lastField|boolean|||The field was the last one to be filled before the form was either submitted or abandoned.|

## GeoEntity {#type--urn-tailjs-core-GeoEntity}
*purposes*: necessary

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|name|string||||
|geonames|integer||||
|iso|string||||
|confidence|number||||

## ImpressionEvent_regions_type {#type--urn-tailjs-core-ImpressionEvent_regions_type}
*purposes*: necessary

Detailed information about the parts of the component that was viewed. This information is only provided if the component spans more than 125 % of the viewport's height.

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|top|[ImpressionRegionStats](#type--urn-tailjs-core-ImpressionRegionStats)|||The top 25 % of the component.|
|middle|[ImpressionRegionStats](#type--urn-tailjs-core-ImpressionRegionStats)|||The middle 25 - 75 % of the component.|
|bottom|[ImpressionRegionStats](#type--urn-tailjs-core-ImpressionRegionStats)|||The bottom 25 % of the component.|

## ImpressionRegionStats {#type--urn-tailjs-core-ImpressionRegionStats}
*purposes*: necessary

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|duration|duration||||
|impressions|integer||||
|seen|percentage||||
|read|percentage|||The percentage of the component's area that was visible at some point during the` View ` .|

## ImpressionTextStats {#type--urn-tailjs-core-ImpressionTextStats}
*purposes*: necessary

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|text|string|||The source text.|
|length|number|||The number of characters in the text.|
|characters|number|||The number of word characters (a letter or number followed by any number of letters, numbers or apostrophes) in the text.|
|words|number|||The number of words in the text. A word is defined as a group of consecutive word characters.|
|sentences|number|||The number of sentences in the text. A sentence is defined as any group of characters where at least one of them is a word character terminated by `.`, `!`, `?` or the end of the text.|
|lix|number|||The LIX index for the text. The measure gives an indication of how difficult it is to read. (https://en.wikipedia.org/wiki/Lix_(readability_test))|
|readTime|number|||The estimated time it will take for an average user to read all the text. The duration is in milliseconds since that is the time precision for ECMAScript timestamps.<br><br>The estimate is assuming "Silent reading time" which seems to be 238 words per minute according to [Marc Brysbaert's research] (https://www.sciencedirect.com/science/article/abs/pii/S0749596X19300786?via%3Dihub)|

## Personalizable {#type--urn-tailjs-core-Personalizable}
*purposes*: necessary

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|personalization|Array\<[Personalization](#type--urn-tailjs-core-Personalization)\>||||

## Position {#type--urn-tailjs-core-Position}
*purposes*: necessary

Represents a position where the units are (CSS pixels)[#DevicePixelRatio].

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|x|number||||
|y|number||||

## ScopeInfo {#type--urn-tailjs-core-ScopeInfo}
*purposes*: necessary

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|id|string||||
|firstSeen|timestamp||||
|lastSeen|timestamp||||
|views|number||||
|isNew|boolean||||
|userAgent|string|||The user agent of the client (only included when debugging).|

## ScreenPosition {#type--urn-tailjs-core-ScreenPosition}
*purposes*: necessary

Represents a position where the units are percentages relative to an element or page.

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|xpx|integer||||
|ypx|integer||||
|x|percentage||||
|y|percentage||||
|pageFolds|number|||The vertical position as a multiple of the page fold position (less than 1 means that the element was visible without scrolling).|

## Session {#type--urn-tailjs-core-Session}
*purposes*: necessary

Identifiers related to a user's session, login and device. Based on the user's consent some of these fields may be unavailable.

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|anonymousSessionId|string|||If a non-anonymous session started as an anonymous session, this is the anonymous session ID. Since an anonymous session is not necessarily unique to a device, processing logic may decide whether and how to stitch the anonymous and non-anonymous session together.|
|sessionId|string|||The unique ID of the user's session. A new sessions starts after 30 minutes of inactivity (this is configurable, but 30 minutes is the default following GA standards). Sessions are reset when an authenticated user logs out (triggered by the` SignOutEvent ` ).<br><br>Aggressive measures are taken to make it literally impossible for third-party scripts to use it for fingerprinting, and virtually impossible for rogue browser extensions. It is persisted in a way that follows best practices for this kind information (secure HTTP-only cookies), hence it can be expected to be as durable as possible for the user's browser and device.<br><br>It is recommended to configure rolling encryption keys to make it cryptographically impossible to use this for fingerprinting.|
|deviceId|string|||The unique ID of the user's device. This ID does most likely not identify the device reliably over time, since it may be reset if the user purges tracking data, e.g. clears cookies or changes browser.<br><br>Aggressive measures are taken to make it literally impossible for third-party scripts to use it for fingerprinting, and virtually impossible for rogue browser extensions. It is persisted in a way that follows best practices for this kind information (secure HTTP-only cookies), hence it can be expected to be as durable as possible for the user's browser and device.<br><br>It is recommended to configure rolling encryption keys to make it cryptographically impossible to use this for fingerprinting.|
|deviceSessionId|string|indirect|performance, functionality|The unique ID of the user's device session ID. A device session starts when the user enters the site like a normal server session, but unlike server sessions, device sessions stay active as long as the user has tabs related to the site open. This means that device sessions survives when the user puts their computer to sleep, or leaves tabs open in the background on their phone.<br><br>After the user has completely left the site, device sessions time out in the same way as server sessions.|
|userId|string|direct||The current user owning the session.|
|consent|[UserConsent](#type--urn-tailjs-core-UserConsent)|||The user's consent choices.` DataClassification.Anonymous ` means the session is cookie-less.|
|clientIp|string|indirect||The IP address of the device where the session is active.|
|collision|boolean|||Indicates that multiple clients are active in the same anonymous session.|
|anonymous|boolean|||Whether the session is using anonymous tracking.|
|expiredDeviceSessionId|string|indirect|performance, functionality|This value indicates that an old device session "woke up" with an old device session ID and took over a new one. This may happen when background tabs are suspended.<br><br>Post-processing can decide how to tie them together when the same tab participates in two sessions (which goes against the definition of a device session).|

## SessionScoped {#type--urn-tailjs-core-SessionScoped}
*purposes*: necessary

Events implementing this interface indicate that they contain information that relates to the entire session and not just the page view where they happened.

## Size {#type--urn-tailjs-core-Size}
*purposes*: necessary

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|width|number||||
|height|number||||

## Tag {#type--urn-tailjs-core-Tag}
*purposes*: necessary

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|tag|string|||The name of the tag including namespace.|
|value|string|||The value of the tag.|
|score|number|||How strongly the tags relates to the target.|

## Tagged {#type--urn-tailjs-core-Tagged}
*purposes*: necessary

Types extending this interface allow custom values that are not explicitly defined in their schema.

See` tags ` for details.

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|tags|Array\<[Tag](#type--urn-tailjs-core-Tag)\>|||Tags in tail.js are a flexible form of key/value pairs that can be used to categorize events, track component parameters and add contextual information to content data organized in a taxonomy specific to your business domain.<br><br>Examples of tags are `promotion, color=black`, `rendering:component:theme=dark`, `ad-campaign=43899`, `ext1:video:play` and `area=investors+9, area=consumers+2`<br><br>As in the examples above, tags can optionally have a value indicated by an equals sign (`=`), and the labels can be organized in taxonomies with each rank/taxon separated by a colon (`:`).<br><br>It is possible to specify "how much" a tag applies to something via a _tag score_. A common use case is to get a straight-forward way categorize sessions based on the users interests. For example, if a user mostly clicks on CTAs and reads content with tags like `audience=investors+8,audience=consumers+1` the score for the "investors" audience will ultimately be higher than the score for "consumers".<br><br>Tags are separated by comma (`,`).<br><br>The following rules apply:<br>- There should not be quotes around tag values. If there are they will get interpreted as part of the value.<br>- Tag names will get "cleaned" while they are tracked, and all letters are converted to lowercase and other characters than numbers, `.`, `-` and `_` are replaced with `_`.<br>- Tag values can be mostly anything, but you should keep them short and prefer referencing things by their external ID instead of their names.<br>- If you need the `,` literal as part of a tag value it can be escaped by adding a backslash in front of it (`\,`), however using commas or similar characters to store a list of values in the same tag is discouraged as each value should rather have its own tag.<br><br>BAD: `selected=1\,2\,3`, `selected=1|2|3` GOOD: `selected=1, selected=2, selected=3`<br><br>BAD: `event=My social gathering in July,source=eventbrite` GOOD: `event:eventbrite:id=8487912`<br><br>BAD: `campaign:promo=true, utm_campaign:fb_aug4_2023` GOOD: `campaign:promo, utm:campaign=fb_aug4_2023`<br><br>Tags can either be added directly to content and component definitions when events are tracked, or added to the HTML elements that contain the components and content.<br><br>Tags are associated with HTML elements either via the `track-tags` attribute, or the `--track-tags` CSS variable in a selector that matches them, and these tags will be added to all content and components they contain including nested HTML elements.<br><br>Since stylesheets can easily be injected to a page via an external tag manager, this makes an easy way to manage the (tail.js) tags externally if you do not have access to developer resources.|

## TrackingSettings {#type--urn-tailjs-core-TrackingSettings}
*purposes*: necessary

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|promote|boolean|||Always include in` UserInteractionEvent.components ` , also if it is a parent component. By default only the closest component will be included.<br><br>This does not apply to impression tracking.<br><br>Not inherited by child components.<br><br>HTML attribute: `track-promote`. CSS: `--track-promote: 1/yes/true`.|
|secondary|boolean|||The component will only be tracked with the closest non-secondary component as if the latter had the` promote ` flag.<br><br>This does not apply to impression tracking.<br><br>Not inherited by child components.<br><br>HTML attribute: `track-secondary`. \ CSS: `--track-secondary: 1/yes/true`.|
|region|boolean|||Track the visible region occupied by the component or content.<br><br>Inherited by child components (also if specified on non-component DOM element).<br><br>HTML attribute: `track-region`. \ CSS: `--track-region: 1/yes/true`.|
|clicks|boolean|||Track clicks. Note that clicks are always tracked if they cause navigation.<br><br>Inherited by child components (also if specified on non-component DOM element).<br><br>HTML attribute: `track-clicks`. CSS: `--track-clicks: 1/yes/true`.|
|impressions|boolean|||Track impressions, that is, when the component becomes visible in the user's browser for the first time. This goes well with` region ` .<br><br>Not inherited by child components.<br><br>HTML attribute: `track-impressions`. CSS: `--track-impressions: 1/yes/true`.|

## UserAgentEvent_screen_type {#type--urn-tailjs-core-UserAgentEvent_screen_type}
*purposes*: necessary

Screen

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|dpr|number|||Device pixel ratio (i.e. how many physical pixels per logical CSS pixel)|
|width|number|||Device width.|
|height|number|||Device height.|
|landscape|boolean|||The device was held in landscape mode.|

## UserAgentEvent_timezone_type {#type--urn-tailjs-core-UserAgentEvent_timezone_type}
*purposes*: necessary

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|iana|string||||
|offset|number|||The offset from GMT in hours.|

## UserAgentLanguage {#type--urn-tailjs-core-UserAgentLanguage}
*purposes*: necessary

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|id|string|||The full language tag as specified by (RFC 5646/BCP 47)[https://datatracker.ietf.org/doc/html/rfc5646]|
|language|string|||The language name (ISO 639).|
|region|string|||Dialect (ISO 3166 region).|
|primary|boolean|||If it is the users primary preference.|
|preference|integer|||The user's preference of the language (1 is highest).|

## ViewEvent_externalReferrer_type {#type--urn-tailjs-core-ViewEvent_externalReferrer_type}
*purposes*: necessary

External referrer. Internal referrers follows from the event's` TrackedEvent ["relatedView"] ` field.

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|href|string||||
|domain|[Domain](#type--urn-tailjs-core-Domain)||||

## ViewEvent_utm_type {#type--urn-tailjs-core-ViewEvent_utm_type}
*purposes*: necessary

Urchin Tracking Module (UTM) parameters as defined by (Wikipedia)[https://en.wikipedia.org/wiki/UTM_parameters].

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|source|string||||
|medium|string||||
|campaign|string||||
|term|string||||
|content|string||||

## ViewTimingData {#type--urn-tailjs-core-ViewTimingData}
*purposes*: necessary

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|activeTime|duration|||The time the user has been active in the view/tab. Interactive time is measured as the time where the user is actively scrolling, typing or similar. Specifically defined as [transient activation](https://developer.mozilla.org/en-US/docs/Glossary/Transient_activation) with a timeout of 10 seconds.|
|visibleTime|duration|||The time the view/tab has been visible.|
|totalTime|duration|||The time elapsed since the view/tab was opened.|
|activations|integer|||The number of times the user toggled away from the view/tab and back.|

## OrderQuantity {#type--urn-tailjs-core-OrderQuantity}
*Extends*: [CommerceData](#type--urn-tailjs-core-CommerceData)
*purposes*: necessary

Base information for the amount of an item added to an` Order ` or cart that is shared between` CartUpdatedEvent ` and` OrderLine ` .

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|units|integer|||The number of units.|
|item|[ExternalReference](#type--urn-tailjs-core-ExternalReference)|||The item that relates to this quantity. If not explictly set it will get its value from the closest associated content in a` UserInteractionEvent ` context.|

## UserConsent {#type--urn-tailjs-core-UserConsent}
*Extends*: [DataUsage](#type--urn-tailjs-core-DataUsage)
*purposes*: necessary

## ComponentElementInfo {#type--urn-tailjs-core-ComponentElementInfo}
*Extends*: [ElementInfo](#type--urn-tailjs-core-ElementInfo)
*purposes*: necessary

Basic information about an HTML element that is associated with a component.

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|component|[Component](#type--urn-tailjs-core-Component)||||

## PersonalizationSource {#type--urn-tailjs-core-PersonalizationSource}
*Extends*: [ExternalReference](#type--urn-tailjs-core-ExternalReference)
*purposes*: necessary

A specific aspect changed for a page or component for personalization as part of a` PersonalizationVariant ` .

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|relatedVariable|string|||In case of a multi-variate test (or similar) that runs over multiple components and/or pages, this can be the ID of the specific variable that decided personalization for a specific component.|
|personalizationType|string|||The kind of personalization that relates to this item.|

## PersonalizationVariable {#type--urn-tailjs-core-PersonalizationVariable}
*Extends*: [ExternalReference](#type--urn-tailjs-core-ExternalReference)
*purposes*: necessary

A reference to a variable and its value in personalization.

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|value|string||||

## PersonalizationVariant {#type--urn-tailjs-core-PersonalizationVariant}
*Extends*: [ExternalReference](#type--urn-tailjs-core-ExternalReference)
*purposes*: necessary

A reference to the data/content item related to a variant in personalization.

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|sources|Array\<[PersonalizationSource](#type--urn-tailjs-core-PersonalizationSource)\>|||The aspects of the component or page the variant changed. There can multiple sources, e.g. a variant may both change the size of a component and change the content at the same time.|
|default|boolean|||If the reference is the default variant.|
|eligible|boolean|||If the variant could have been picked.|
|selected|boolean|||If the variant was chosen.|

## SearchFieldReferenceFilter {#type--urn-tailjs-core-SearchFieldReferenceFilter}
*Extends*: [ExternalReference](#type--urn-tailjs-core-ExternalReference)
*purposes*: necessary

A search filter that applies to a single field that must match a defined entity (e.g. "manufacturer").

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|references|Array\<[ExternalReference](#type--urn-tailjs-core-ExternalReference)\>|||A list of entities where the field must match at least one of them (or none depending on the comparison).|
|comparison|string||||

## SearchFilter {#type--urn-tailjs-core-SearchFilter}
*Extends*: [ExternalReference](#type--urn-tailjs-core-ExternalReference)
*purposes*: necessary

A filter that applies to a field in a search query.

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|group|number|||If the filter consisted of multiple groups of filters where one of them should match this can be used to separate the groups.<br><br>For example (age\$1=10 AND age\$1=20 AND type=horse) OR (age\$15 AND type=cat).|
|value|string or number or boolean|||The value the field must match. Use UNIX ms timestamps for dates and durations. If the value is the ID of a defined entity use` reference ` instead.|
|reference|[ExternalReference](#type--urn-tailjs-core-ExternalReference)|||If the value is a defined entity such as a product category use this instead of` value ` .|
|comparison|string|||How the field compares against the value.|

## SearchResult {#type--urn-tailjs-core-SearchResult}
*Extends*: [ExternalReference](#type--urn-tailjs-core-ExternalReference)
*purposes*: necessary

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|rank|integer||||

## DeviceInfo {#type--urn-tailjs-core-DeviceInfo}
*Extends*: [ScopeInfo](#type--urn-tailjs-core-ScopeInfo)
*purposes*: necessary

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|id|string||||
|sessions|number||||

## SessionInfo {#type--urn-tailjs-core-SessionInfo}
*Extends*: [ScopeInfo](#type--urn-tailjs-core-ScopeInfo)
*purposes*: necessary

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|id|string||||
|deviceId|string|||Used to handle race conditions. When multiple session are created from concurrent requests, the winning session contains the device ID.|
|deviceSessionId|string||||
|userId|string||||
|previousSession|timestamp||||
|hasUserAgent|boolean||||
|anonymous|boolean|||The session id anonymous.|
|anonymousSessionId|string|||If the user upgraded their consent, this will be the original anonymous session ID.|
|tabs|number|||The total number of tabs opened during the session.|

## Rectangle {#type--urn-tailjs-core-Rectangle}
*Extends*: [Position](#type--urn-tailjs-core-Position), [Size](#type--urn-tailjs-core-Size)
*purposes*: necessary

## Component {#type--urn-tailjs-core-Component}
*Extends*: [Tagged](#type--urn-tailjs-core-Tagged), [ExternalReference](#type--urn-tailjs-core-ExternalReference), [Personalizable](#type--urn-tailjs-core-Personalizable)
*purposes*: necessary

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|typeName|string|||An additional type name that defines the component as represented in code. For example, the name of a (p)react component or ASP.NET partial.|
|instanceId|string|||An optional, unique identifier for the specific instance of the component with its parameters and current position in the rendered element tree.|
|instanceNumber|integer|||If the same component type is used multiple times on the same page this number indicates which one it is. (As defined in the page's markup, typically this amounts to left-to-right/top-to-bottom).|
|inferred|boolean|||A flag indicating whether the component was automatically inferred from context (e.g. by traversing the tree of React components).|
|dataSource|[ExternalReference](#type--urn-tailjs-core-ExternalReference)|||Optional references to the content that was used to render the component.|

## Content {#type--urn-tailjs-core-Content}
*Extends*: [ExternalReference](#type--urn-tailjs-core-ExternalReference), [Tagged](#type--urn-tailjs-core-Tagged)
*purposes*: necessary

Represents a content item that can be rendered or modified via a` Component ` 

If the content is personalized please add the criteria

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|commerce|[CommerceData](#type--urn-tailjs-core-CommerceData)||||

## Order {#type--urn-tailjs-core-Order}
*Extends*: [Tagged](#type--urn-tailjs-core-Tagged)
*purposes*: necessary

Represents an order for tracking purposes.

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|internalId|string|||A reference that can be used both before the order is completed, and if the order ID shown to the user is different from how the order is stored in underlying systems.|
|orderId|string|||The order ID as shown to the user.|
|items|Array\<[OrderLine](#type--urn-tailjs-core-OrderLine)\>|||Optionally, all the items in the order at the time the order was made.|
|discount|decimal|||The total discount given for this order including the sum of individual order line discounts|
|delivery|decimal|||The delivery cost, if any, and it is not included as an order line.|
|vat|decimal|||The VAT included in the total.|
|total|decimal|||The total of the order including VAT, delivery, discounts and any other costs added.|
|paymentMethod|string|||The payment method selected for the order.|
|currency|string|||The currency used for the order.<br><br>The order lines are assumed to be in this currency if not explicitly specified for each. (It is not an error to have order lines with different currencies it is just a bit... unusual).|

## Personalization {#type--urn-tailjs-core-Personalization}
*Extends*: [Tagged](#type--urn-tailjs-core-Tagged)
*purposes*: necessary

The choices made by some logic to show different content to different users depending on some traits either to help them or to make them buy more.

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|source|[ExternalReference](#type--urn-tailjs-core-ExternalReference)|||The source and definition for the personalization. This could be a named rule set, a test definition or a specific configuration of an algorithm.<br><br>If you are using multiple services/system for personalization you can add this to` ExternalReference.source ` .<br><br>If more than one component was changed by the same personalization logic they will share this source, but may have different variables.<br><br>For example, the personalization in each component may correspond to different variables in a multivariate test. In that case the components will share the` Personalization.source ` corresponding to the test, but have different` Personalization.variable ` s.|
|variables|Array\<[PersonalizationVariable](#type--urn-tailjs-core-PersonalizationVariable)\>|||Typically used for the test variables in a A/B/MV test, but can also be used for significant weights/parameters in more complex algorithms.|
|variants|Array\<[PersonalizationVariant](#type--urn-tailjs-core-PersonalizationVariant)\>|||The set of choices that were possible at the time given the user. Even though implied, this should include the choice made so the data does not look inconsistent.<br><br>To represent the default valuesvfor the sources that can be personalized, include the default variant and assign the default settings to it as sources.|

## CartEventData {#type--urn-tailjs-core-CartEventData}
*Extends*: [OrderQuantity](#type--urn-tailjs-core-OrderQuantity), [ExternalUse](#type--urn-tailjs-core-ExternalUse)
*purposes*: necessary

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|action|string|||The way the cart was modified.|

## OrderLine {#type--urn-tailjs-core-OrderLine}
*Extends*: [OrderQuantity](#type--urn-tailjs-core-OrderQuantity), [Tagged](#type--urn-tailjs-core-Tagged)
*purposes*: necessary

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|lineId|string|||An optional identifier that makes it possible to reference this order line directly.|
|vat|decimal|||The VAT included in the total.|
|total|decimal|||The total for this order line including VAT|

## Viewport {#type--urn-tailjs-core-Viewport}
*Extends*: [Rectangle](#type--urn-tailjs-core-Rectangle)
*purposes*: necessary

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|totalWidth|number||||
|totalHeight|number||||

## ActivatedComponent {#type--urn-tailjs-core-ActivatedComponent}
*Extends*: [Component](#type--urn-tailjs-core-Component)
*purposes*: necessary

The component definition related to a user activation.

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|content|Array\<[ActivatedContent](#type--urn-tailjs-core-ActivatedContent)\>|||The activated content in the component.|
|area|string|||An optional name of the area of the page (i.e. in the DOM) where the component is rendered. By convention this should the path of nested content areas separated by a slash.|
|rect|[Rectangle](#type--urn-tailjs-core-Rectangle)|||The size and position of the component when it was activated relative to the document top (not viewport).|

## ConfiguredComponent {#type--urn-tailjs-core-ConfiguredComponent}
*Extends*: [Component](#type--urn-tailjs-core-Component)
*purposes*: necessary

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|track|[TrackingSettings](#type--urn-tailjs-core-TrackingSettings)|||Settings for how the component will be tracked.<br><br>These settings are not tracked, that is, this property is stripped from the data sent to the server.|

## ActivatedContent {#type--urn-tailjs-core-ActivatedContent}
*Extends*: [Content](#type--urn-tailjs-core-Content)
*purposes*: necessary

The content definition related to a user activation.

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|rect|[Rectangle](#type--urn-tailjs-core-Rectangle)|||The current size and position of the element representing the content relative to the document top (not viewport).|

## View {#type--urn-tailjs-core-View}
*Extends*: [Content](#type--urn-tailjs-core-Content), [Personalizable](#type--urn-tailjs-core-Personalizable)
*purposes*: necessary

|Name|Type|Privacy|Purposes|Description|
|-|-|-|-|-|
|preview|boolean|||The page was shown in preview/staging mode.|