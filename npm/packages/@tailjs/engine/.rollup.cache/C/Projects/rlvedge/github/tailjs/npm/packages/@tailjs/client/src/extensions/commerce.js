import { isCartCommand, isOrderCommand } from "..";
import { F, T, equals, forAncestorsOrSelf, getBoundaryData, item, nil, obj, push, str, trackerProperty, undefined, } from "../lib";
export const parseCartEventData = (data) => (data == nil ? undefined : (data === T || data === "") && (data = "add"),
    str(data) && equals(data, "add", "remove", "update", "clear")
        ? { action: data }
        : obj(data)
            ? data
            : undefined);
function normalizeCartEventData(data) {
    if (!data)
        return undefined;
    if (data.units != nil && equals(data.action, nil, "add", "remove")) {
        if (data.units === 0)
            return undefined;
        data.action = data.units > 0 ? "add" : "remove";
    }
    return data;
}
export function tryGetCartEventData(sourceElement) {
    // Find cart. Look for cart attributes and/or data until the first content is met.
    let contextCart;
    forAncestorsOrSelf(sourceElement, (el, r) => !!(contextCart ??= parseCartEventData(getBoundaryData(el)?.cart ?? trackerProperty(el, "cart"))) &&
        !contextCart.item &&
        (contextCart.item = item(getBoundaryData(el)?.content, -1)) &&
        r(contextCart));
    return normalizeCartEventData(contextCart);
}
export const commerce = {
    id: "cart",
    setup(tracker) {
        return {
            processCommand(command) {
                if (isCartCommand(command)) {
                    let cart = command.cart;
                    cart === "clear"
                        ? push(tracker, {
                            type: "CART_UPDATED",
                            action: "clear",
                        })
                        : (cart = normalizeCartEventData(cart)) &&
                            push(tracker, {
                                ...cart,
                                type: "CART_UPDATED",
                            });
                    return T;
                }
                if (isOrderCommand(command)) {
                    push(tracker, {
                        type: "ORDER",
                        ...command.order,
                    });
                    return T;
                }
                return F;
            },
        };
    },
};
//# sourceMappingURL=commerce.js.map