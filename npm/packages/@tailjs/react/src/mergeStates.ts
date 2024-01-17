import { BoundaryData } from "@tailjs/client";
import { BoundaryDataWithView } from "./Tracker";

function mergeArrays<T>(
  lhs: T | T[] | undefined | null,
  rhs: T | T[] | undefined | null
): T | T[] | undefined | null {
  return !lhs ? rhs : !rhs ? lhs : [...asArray(lhs), ...asArray(rhs)];
}

export function asArray<T>(item: T | T[] | undefined | null) {
  return !item ? [] : Array.isArray(item) ? item : [item];
}

export function filterCurrent<T>(
  current: T | T[] | undefined | null,
  added: T | T[] | undefined | null,
  selector: (item: T) => string
) {
  if (!added || !current) return added;
  var currentIds = new Set([...asArray(current).map(selector)]);
  const filtered = asArray(added).filter(
    (item) => !currentIds.has(selector(item))
  );
  return filtered.length === 0 ? undefined : filtered;
}

export function mergeStates(
  current: BoundaryDataWithView | null,
  mapped: BoundaryDataWithView | null | void
): BoundaryDataWithView | null {
  if (!current) return mapped ?? null;
  if (!mapped) return current;

  const merged = {
    view: mapped?.view,
    content: mergeArrays(current?.content, mapped?.content),
    component: mergeArrays(current?.component, mapped?.component),
    area: current?.area ?? mapped?.area,
    tags: mergeArrays(current?.tags, mapped?.tags),
    cart: mapped?.cart ?? current?.cart,
  };
  if (
    Array.isArray(merged.component) &&
    merged.component.some((cmp) => cmp.inferred !== true)
  ) {
    merged.component = merged.component.filter((cmp) => cmp.inferred !== true);
  }
  return merged;
}
