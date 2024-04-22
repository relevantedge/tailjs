import type { Float, Integer, SessionScoped, TrackedEvent } from "..";
import { typeTest } from "../util/type-test";

export interface UserAgentLanguage {
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

export interface UserAgentEvent extends TrackedEvent, SessionScoped {
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

    /** Whether the device is held in landscape mode.
     * @default false
     */
    landscape?: boolean;
  };
}

export const isUserAgentEvent = typeTest<UserAgentEvent>("user_agent");
