import type { CommerceEvent, Decimal, Order } from "..";
import { typeTest } from "../util/type-test";

/**
 * Events related to order payments.
 */
export interface PaymentEvent extends CommerceEvent {
  /**
   * The reference to order for which payment was made, either {@link Order.orderId} or {@link Order.internalId}.
   */
  orderReference: string;
  /**
   * The amount paid.
   */
  amount: Decimal;

  /**
   * A domain specific value for the payment method.
   */
  paymentMethod?: string;

  /** The currency of the payment. */
  currency?: string;
}

/**
 * The payment for an order was accepted.
 */
export interface PaymentAcceptedEvent extends PaymentEvent {
  type: "payment_accepted";

  /**
   * The payment was the final payment, hence completed the order.
   * @default true;
   */
  finalPayment?: boolean;
}

/**
 * A payment for the order was rejected.
 */
export interface PaymentRejectedEvent extends PaymentEvent {
  type: "payment_rejected";
}

export const isPaymentAcceptedEvent =
  typeTest<PaymentAcceptedEvent>("payment_accepted");
export const isPaymentRejectedEvent =
  typeTest<PaymentRejectedEvent>("payment_rejected");
