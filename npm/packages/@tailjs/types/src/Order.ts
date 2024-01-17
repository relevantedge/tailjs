import type { Tagged, OrderLine, Decimal } from ".";

/**
 * Represents an order for tracking purposes.
 *
 */
export interface Order extends Tagged {
  /**
   * A reference that can be used both before the order is completed, and if the order ID shown to the user is different from how the order is stored in underlying systems.
   */
  internalId?: string;

  /**
   * The order ID as shown to the user.
   */
  orderId: string;

  /**
   * Optionally, all the items in the order at the time the order was made.
   */
  items?: OrderLine[];

  /**
   * The total discount given for this order including the sum of individual order line discounts
   */
  discount?: Decimal;

  /**
   * The delivery cost, if any, and it is not included as an order line.
   */
  delivery?: Decimal;

  /**
   * The VAT included in the total.
   *
   */
  vat?: Decimal;

  /**
   * The total of the order including VAT, delivery, discounts and any other costs added.
   *
   */
  total?: Decimal;

  /**
   * The payment method selected for the order.
   */
  paymentMethod?: string;

  /**
   * The currency used for the order.
   *
   * The order lines are assumed to be in this currency if not explicitly specified for each.
   * (It is not an error to have order lines with different currencies it is just a bit... unusual).
   */
  currency?: string;
}
