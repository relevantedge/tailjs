import type {
  Domain,
  Integer,
  LocalID,
  TrackedEvent,
  View,
  ViewTimingData,
  Viewport,
} from "..";
import { typeTest } from "../util/type-test";

export interface ClickIds {
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
export interface ViewEvent extends TrackedEvent {
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

  // queryString?: {
  //   source: Record<string, string>;
  //   parsed: Record<string, string[]>;
  // };

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

export const isViewEvent = typeTest<ViewEvent>("view");
