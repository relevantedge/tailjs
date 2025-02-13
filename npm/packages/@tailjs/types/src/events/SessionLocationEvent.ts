import type {
  Float,
  GeoEntity,
  Percentage,
  SessionScoped,
  TrackedEvent,
} from "..";
import { typeTest } from "../util/type-test";

/**
 * This event is triggered whenever the user's location changes.
 *
 * @privacy indirect, performance
 */
export interface SessionLocationEvent extends TrackedEvent, SessionScoped {
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

export const isClientLocationEvent =
  typeTest<SessionLocationEvent>("session_location");
