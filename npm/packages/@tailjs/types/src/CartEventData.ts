import type { OrderQuantity, CartAction, ExternalUse } from ".";

export interface CartEventData extends OrderQuantity, ExternalUse {
  /**
   * The way the cart was modified.
   *
   * @default add
   */
  action?: CartAction;
}
