import { Order, OrderEvent } from "@tailjs/types";
import { commandTest } from "./shared";

/**
 * Shorthand command to trigger an {@link OrderEvent} event.
 */
export interface OrderCommand {
  /**
   * The order that was completed or cancelled.
   */
  order: Order;
}

export const isOrderCommand = commandTest<OrderCommand>("order");
