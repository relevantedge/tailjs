import type { Decimal, OrderQuantity, Tagged } from ".";

export interface OrderLine extends OrderQuantity, Tagged {
  /**
   * An optional identifier that makes it possible to reference this order line directly.
   */
  lineId?: string;

  /**
   * The VAT included in the total.
   */
  vat?: Decimal;

  /**
   * The total for this order line including VAT
   */
  total?: Decimal;
}
