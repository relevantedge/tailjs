import type { Float, GeoEntity, SessionScoped, TrackedEvent } from "..";
import { typeTest } from "../util/type-test";

/**
 * This event is triggered whenever the user's location changes.
 *
 * @privacy indirect, performance
 */
export interface SessionLocationEvent extends TrackedEvent, SessionScoped {
  type: "session_location";

  /**
   * This number is like the precise definition of what the bars indicating signal strength on mobile phones represents.
   * Nobody knows. Yet, for this number lower is better.
   */
  accuracy?: Float;

  /** @privacy anonymous, infrastructure */
  continent?: GeoEntity;

  /** @privacy anonymous, infrastructure */
  country?: GeoEntity;

  subdivision?: GeoEntity;

  zip?: string;

  city?: GeoEntity;

  lat?: Float;
  lng?: Float;
}

export const isClientLocationEvent =
  typeTest<SessionLocationEvent>("session_location");
