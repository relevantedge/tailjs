import { CommerceEvent, Order, TrackedEvent } from "..";
import { typeTest } from "../util/type-test";

/**
 * An order submitted by a user.
 */
export interface OrderEvent extends CommerceEvent, Order {
  type: "order";
}

export const isOrderEvent = typeTest<OrderEvent>("order");
