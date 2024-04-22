import {
  type CartAction,
  type CartEventData,
  type CartUpdatedEvent,
  type OrderEvent,
} from "@tailjs/types";
import type { Nullish } from "@tailjs/util";
import { TrackerExtensionFactory, isCartCommand, isOrderCommand } from "..";
import {
  F,
  T,
  equals,
  forAncestorsOrSelf,
  getBoundaryData,
  item,
  nil,
  obj,
  push,
  str,
  trackerProperty,
  undefined,
} from "../lib";

export const parseCartEventData = (
  data: boolean | string | CartEventData | Nullish
): CartEventData | undefined => (
  data == nil ? undefined : (data === T || data === "") && (data = "add"),
  str(data) && equals(data, "add", "remove", "update", "clear")
    ? { action: data as CartAction }
    : obj(data)
    ? data
    : undefined
);

function normalizeCartEventData(data: CartEventData | Nullish) {
  if (!data) return undefined;

  if (data.units != nil && equals(data.action, nil, "add", "remove")) {
    if (data.units === 0) return undefined;
    data.action = data.units > 0 ? "add" : "remove";
  }
  return data;
}

export function tryGetCartEventData(sourceElement: Element) {
  // Find cart. Look for cart attributes and/or data until the first content is met.
  let contextCart: CartEventData | Nullish;
  forAncestorsOrSelf(
    sourceElement,
    (el, r) =>
      !!(contextCart ??= parseCartEventData(
        getBoundaryData(el)?.cart ?? trackerProperty(el, "cart")
      )) &&
      !contextCart.item &&
      (contextCart.item = item(getBoundaryData(el)?.content, -1)) &&
      r(contextCart)
  );

  return normalizeCartEventData(contextCart);
}

export const commerce: TrackerExtensionFactory = {
  id: "cart",
  setup(tracker) {
    return {
      processCommand(command) {
        if (isCartCommand(command)) {
          let cart = command.cart;
          cart === "clear"
            ? push(tracker, {
                type: "cart_updated",
                action: "clear",
              } as CartUpdatedEvent)
            : (cart = normalizeCartEventData(cart)!) &&
              push(tracker, {
                ...cart,
                type: "cart_updated",
              } as CartUpdatedEvent);

          return T;
        }
        if (isOrderCommand(command)) {
          push(tracker, {
            type: "order",
            ...command.order,
          } as OrderEvent);

          return T;
        }
        return F;
      },
    };
  },
};
