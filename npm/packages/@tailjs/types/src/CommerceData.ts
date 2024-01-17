import { Decimal, ExternalReference, Float } from ".";

export interface CommerceData {
  /**
   * The unit price.
   */
  price?: Decimal;

  /**
   * The unit the item is sold by.
   */
  unit?: string;

  /**
   * The currency of the price. This field does not have a default value; if unspecified it must be assumed from context.
   */
  currency?: string;

  /**
   * The specific variant of the content if the item sold comes in different variations (e.g. red/green/purple).
   */
  variation?: ExternalReference;

  /**
   * The current number of units in stock.
   *
   * Use fixed integer values if you do not want to reveal the actual stock, e.g. (0 = none, 10 = few, 100 = many).
   */
  stock?: Float;
}
