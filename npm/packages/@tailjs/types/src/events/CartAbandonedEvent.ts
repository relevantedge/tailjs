import type { CommerceEvent, Order, Timestamp } from "..";
import { typeTest } from "../util/type-test";

/**
 * The shopping cart was abandoned.
 * Currently there is no logic in the tracker to trigger this event automatically, hence a custom trigger must be implemented.
 *
 */
export interface CartAbandonedEvent extends CommerceEvent, Order {
  type: "CART_ABANDONED";

  /**
   * The timestamp for the last time the shopping cart was modified by the user before abandonment.
   */
  lastCartEvent?: Timestamp;
}

export const isCartAbandonedEvent =
  typeTest<CartAbandonedEvent>("CART_ABANDONED");
