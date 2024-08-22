import type { BoundaryDataWithView } from "..";

export const tryGet = <T, P extends keyof T>(
  src: T,
  prop: P
): T[P] | undefined => {
  try {
    return src[prop];
  } catch (e) {
    return undefined;
  }
};

// Reduce bundle size by not referencing @tailjs/util and just having the two needed functions here.
const array = (item: any) => (Array.isArray(item) ? item : [item]);
const concat = (left: any, right: any) =>
  left === right
    ? left
    : left == null
    ? right
    : right == null
    ? right
    : [...array(left), ...array(right)];

export function filterCurrent<T>(
  current: T | readonly T[] | undefined | null,
  added: T | readonly T[] | undefined | null,
  selector: (item: T) => string
): undefined | T[] {
  if (!added || !current) return added as any;

  var currentIds = new Set([...array(current).map(selector as any)]);
  const filtered = array(added).filter(
    (item) => !currentIds.has(selector(item as any))
  );
  return filtered.length === 0 ? undefined : (filtered as any);
}

export function mergeStates(
  current: BoundaryDataWithView | null,
  mapped: BoundaryDataWithView | null | void
): BoundaryDataWithView | null {
  if (!current) return mapped ?? null;
  if (!mapped) return current;

  const merged = {
    view: mapped?.view,
    content: concat(current?.content, mapped?.content),
    component: concat(current?.component, mapped?.component),
    area: current?.area ?? mapped?.area,
    tags: concat(current?.tags, mapped?.tags),
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
