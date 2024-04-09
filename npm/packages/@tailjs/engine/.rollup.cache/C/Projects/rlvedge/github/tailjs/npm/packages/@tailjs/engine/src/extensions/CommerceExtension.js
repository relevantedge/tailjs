import { isCartEvent, isOrderEvent, } from "@tailjs/types";
function fillPriceDefaults(data, content) {
    if (!content)
        return data;
    data.price ??= content.commerce?.price;
    data.unit ??= content.commerce?.unit;
    data.currency ??= content.commerce?.unit;
    return data;
}
function normalizeCartEventData(data) {
    if (!data)
        return undefined;
    fillPriceDefaults(data, data.item);
    if (data.units != null &&
        (data.action == null || data.action === "add" || data.action === "remove")) {
        if (data.units === 0)
            return undefined;
        data.action = data.units > 0 ? "add" : "remove";
    }
    return data;
}
function sum(lines, selector) {
    let selected;
    return !lines
        ? undefined
        : lines.reduce((sum, item) => (selected = selector(item)) != null ? (sum ?? 0) + selected : sum, undefined);
}
function normalizeOrder(order) {
    if (!order)
        return order;
    if (Array.isArray(order.items)) {
        order.items = order.items.map(normalizeOrderLine);
        if (order.total == null) {
            order.total = sum(order.items, (line) => line.total);
        }
        if (order.vat == null) {
            order.vat = sum(order.items, (line) => line.vat);
        }
    }
    return order;
}
function normalizeOrderLine(line) {
    if (!line)
        return line;
    fillPriceDefaults(line, line.item);
    if (line.total == null && line.price != null && line.units != null) {
        line.total = line.price * line.units;
    }
    if (line.price == null && line.total != null && line.units != null) {
        line.price = line.units !== 0 ? line.total / line.units : 0;
    }
    return line;
}
export class CommerceExtension {
    id = "commerce";
    patch(events, next) {
        return next(events.map((event) => isOrderEvent(event)
            ? normalizeOrder(event)
            : isCartEvent(event)
                ? normalizeCartEventData(event)
                : event));
    }
}
//# sourceMappingURL=CommerceExtension.js.map