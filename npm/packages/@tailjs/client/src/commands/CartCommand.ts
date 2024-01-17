import { CartEventData } from "@tailjs/types";
import { commandTest } from "./shared";

/**
 * Triggers events related to a shopping cart.
 */
export interface CartCommand {
  cart: "clear" | CartEventData;
}

export const isCartCommand = commandTest<CartCommand>("cart");
