import type { TrackedEvent } from "..";
import { typeTest } from "../util/type-test";

/**
 * Base event for events that related to an order changing status.
 */
export interface OrderStatusEvent extends TrackedEvent {
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
export interface OrderConfirmedEvent extends TrackedEvent {
  type: "order_confirmed";
}

/**
 * An order was cancelled.
 */
export interface OrderCancelledEvent extends TrackedEvent {
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
export interface OrderCompletedEvent extends TrackedEvent {
  type: "order_completed";
}
export const isOrderCancelledEvent =
  typeTest<OrderCancelledEvent>("order_cancelled");

export const isOrderCompletedEvent =
  typeTest<OrderCancelledEvent>("order_completed");
