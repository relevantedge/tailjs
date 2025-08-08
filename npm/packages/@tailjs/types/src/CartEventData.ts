import type { OrderQuantity, CartAction, Tagged } from ".";

export interface CartEventData extends OrderQuantity, Tagged {
  /**
   * The way the cart was modified.
   *
   * @default add
   */
  action?: CartAction;
}
