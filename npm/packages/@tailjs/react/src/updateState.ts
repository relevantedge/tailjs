import { BoundaryDataWithView } from "./jsx.pkg/visit";

const mergeArrays = <T>(
  value1: T | readonly T[] | null | undefined,
  value2: T | readonly T[] | null | undefined,
  uniqueKey?: false | ((value: T) => any)
) => {
  if (value1 == null) {
    return value2;
  }
  if (value2 == null) {
    return value1;
  }
  let merged: T[] = [];
  if (Array.isArray(value1)) {
    merged.push(...value1);
  } else {
    merged.push(value1 as T);
  }

  if (Array.isArray(value2)) {
    merged.push(...value2);
  } else {
    merged.push(value2 as T);
  }

  if (Array.isArray(merged) && uniqueKey) {
    const seen = new Set();
    merged = merged.filter((value) => {
      let key = uniqueKey(value);
      if (key && seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
    if (merged.length === 1) {
      return merged[0];
    }
  }

  return merged;
};
export const updateState = (
  current: BoundaryDataWithView | null | undefined,
  state: BoundaryDataWithView,
  uniqueIds = true
) => {
  if (!current) {
    return state;
  }
  current = { ...current };
  if (state.view) {
    current.view = state.view;
  }
  if (state.component != null) {
    current.component = mergeArrays(
      current.component,
      state.component,
      uniqueIds && ((item) => item.id)
    );
  }
  if (state.content != null) {
    current.content = mergeArrays(
      current.content,
      state.content,
      uniqueIds && ((item) => item.id)
    );
  }
  if (state.area != null) {
    current.area = state.area;
  }
  if (state.tags != null) {
    current.tags = mergeArrays(current.tags as any, state.tags);
  }
  if (state.cart != null) {
    current.cart = state.cart;
  }
  if (state.track != null) {
    current.track = state.track;
  }

  return current;
};
