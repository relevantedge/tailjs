import {
  type CartAction,
  type CartEventData,
  type CartUpdatedEvent,
  type OrderEvent,
} from "@tailjs/types";
import {
  F,
  T,
  equalsAny,
  isObject,
  isString,
  last,
  nil,
  push,
  type Nullish,
} from "@tailjs/util";
import { TrackerExtensionFactory, isCartCommand, isOrderCommand } from "..";
import { forAncestorsOrSelf, getBoundaryData, trackerProperty } from "../lib";

export const parseCartEventData = (
  data: boolean | string | CartEventData | Nullish
): CartEventData | undefined => (
  data == nil ? undefined : (data === T || data === "") && (data = "add"),
  isString(data) && equalsAny(data, "add", "remove", "update", "clear")
    ? { action: data as CartAction }
    : isObject(data)
    ? data
    : undefined
);

function normalizeCartEventData(data: CartEventData | Nullish) {
  if (!data) return undefined;

  if (data.units != nil && equalsAny(data.action, nil, "add", "remove")) {
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
      (contextCart.item = last(getBoundaryData(el)?.content)) &&
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
