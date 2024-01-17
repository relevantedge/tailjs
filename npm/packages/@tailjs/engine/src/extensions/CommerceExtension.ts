import {
  CartEventData,
  CommerceData,
  Content,
  Order,
  OrderLine,
  TrackedEvent,
  isCartEvent,
  isOrderCancelledEvent,
  isOrderEvent,
} from "@tailjs/types";
import type { ValidationError, TrackerExtension, NextPatchExtension } from "..";

function fillPriceDefaults(
  data: CommerceData,
  content: Content | null | undefined
) {
  if (!content) return data;
  data.price ??= content.commerce?.price;
  data.unit ??= content.commerce?.unit;
  data.currency ??= content.commerce?.unit;
  return data;
}

function normalizeCartEventData<T extends CartEventData | undefined>(
  data: T
): T {
  if (!data) return undefined!;
  fillPriceDefaults(data, data.item);

  if (
    data.units != null &&
    (data.action == null || data.action === "add" || data.action === "remove")
  ) {
    if (data.units === 0) return undefined!;
    data.action = data.units > 0 ? "add" : "remove";
  }
  return data;
}

function sum(
  lines: OrderLine[] | undefined,
  selector: (line: OrderLine) => number | undefined
) {
  let selected: number | undefined;
  return !lines
    ? undefined
    : lines.reduce(
        (sum, item) =>
          (selected = selector(item)) != null ? (sum ?? 0) + selected : sum,
        undefined as number | undefined
      );
}

function normalizeOrder<T extends Order | undefined>(order: T): T {
  if (!order) return order;
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

function normalizeOrderLine<T extends OrderLine>(line: T): T {
  if (!line) return line;
  fillPriceDefaults(line, line.item);
  if (line.total == null && line.price != null && line.units != null) {
    line.total = line.price * line.units;
  }
  if (line.price == null && line.total != null && line.units != null) {
    line.price = line.units !== 0 ? line.total / line.units : 0;
  }

  return line;
}

export class CommerceExtension implements TrackerExtension {
  public readonly name = "commerce";

  patch?(
    next: NextPatchExtension,
    events: TrackedEvent[]
  ): Promise<TrackedEvent[]> {
    return next(
      events.map((event) =>
        isOrderEvent(event)
          ? normalizeOrder(event)
          : isCartEvent(event)
          ? normalizeCartEventData(event)
          : event
      )
    );
  }
}
