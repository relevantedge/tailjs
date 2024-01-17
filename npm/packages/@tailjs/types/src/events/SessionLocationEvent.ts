import type { Float, GeoEntity, SessionScoped, TrackedEvent } from "..";
import { typeTest } from "../util/type-test";

export interface SessionLocationEvent extends TrackedEvent, SessionScoped {
  type: "SESSION_LOCATION";

  /**
   * This number is like the precise definition of what the bars indicating signal strength on mobile phones represents.
   * Nobody knows. Yet, for this number lower is better.
   */
  accuracy?: Float;

  city?: GeoEntity;
  zip?: string;
  subdivision?: GeoEntity;
  country?: GeoEntity;
  continent?: GeoEntity;

  lat?: Float;
  lng?: Float;

  providerData?: Record<string, any>;
}

export const isClientLocationEvent =
  typeTest<SessionLocationEvent>("SESSION_LOCATION");
