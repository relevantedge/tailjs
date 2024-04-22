import type { CartEventData, CommerceEvent, UserInteractionEvent } from "..";
import { typeTest } from "../util/type-test";

export type CartAction = "add" | "remove" | "update" | "clear";

/**
 * Indicates that a shopping cart was updated.
 */
export interface CartUpdatedEvent
  extends UserInteractionEvent,
    CommerceEvent,
    CartEventData {
  type: "cart_updated";
}

export const isCartEvent = typeTest<CartUpdatedEvent>("cart_updated");
