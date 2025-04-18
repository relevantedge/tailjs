import { clone2, forEach2, isNumber, isPlainObject, structuralEquals } from ".";

export type Wrapped<T> = T | (() => T);

export type Unwrap<T> = T extends () => infer R ? R : T;

export const unwrap: {
  <T>(value: Wrapped<T>): T;
} = (value: Wrapped<any>): any =>
  typeof value === "function" ? value() : value;

/**
 * Calculates the difference between the current version of an object, and the changed values specified.
 * If an updated property is numeric, the delta will be the difference between the updated and current number.
 * If an updated property is the same as the current value, it will not be included in the diff result,
 * otherwise this algorithm is no more sophisticated than just returning the new value in the diff (e.g. nothing special about strings).
 *
 * @returns A tuple with the first element being the differences between the updates and the current version,
 *  and the second element a clone of the current value with the changes applied.
 *  The latter should be passed as the second argument, next time the diff is calculated.
 */
export const diff = <T>(
  updated: T,
  previous: T | undefined
): [delta: T, current: T] | undefined => {
  if (!updated) return undefined;
  if (!isPlainObject(previous)) return [updated, updated];

  const delta: any = {};
  let patchedValue: any;
  let previousValue: number | undefined;

  // If there are changes, this will be a clone of the previous value with the delta changes applied.
  let patched: any;

  if (isPlainObject(updated)) {
    forEach2(updated, ([key, value]) => {
      if (structuralEquals(value, previous[key], -1)) {
        // No changes.
        return;
      }

      if (isPlainObject((patchedValue = value))) {
        // deltaValue will be undefined if there are no changed in the child object.
        if (!(value = diff(value, previous[key]))) {
          return;
        }
        [value, patchedValue] = value;
      } else if (isNumber(value) && isNumber(previousValue)) {
        value = (patchedValue = value) - previousValue;
      }

      delta[key] = value;
      (patched ??= clone2(previous))[key] = patchedValue;
    });
    return patched ? [delta, patched] : undefined;
  }

  return undefined;
};

export type Interval<T> = [start: T, end: T];
export type Intervals<T = number> = ReadonlyArray<[start: T, end: T]> & {
  /**
   * Updates the intervals to include the specified start and end,
   * and returns the updated total width.
   *
   */
  push: (start: T, end: T) => number;

  /** The total width of the intervals. */
  width: number;
};

export const createIntervals = <T = number>(
  cmp: (x: T, y: T) => number = (x: any, y: any) => (x - y) as any,
  width: (interval: Interval<T>) => number = (interval: any) =>
    (interval[1] - interval[0]) as any
): Intervals<T> => {
  const ranges: Interval<T>[] = [];

  return Object.assign(ranges, {
    push(start: T, end: T) {
      let pending: Interval<T> | undefined = [start, end];

      const finalize = (update: any = true) =>
        update
          ? ((ranges as any).width = ranges.reduce(
              (sum, interval) => sum + width(interval),
              0
            ))
          : (ranges as any).width;

      let changed: any;
      for (let i = 0; i < ranges.length; i++) {
        let current = ranges[i];
        if (cmp(pending[1], current[0]) < 0) {
          // Ends before next start. Insert before.
          return finalize(ranges.splice(i, 0, pending));
        } else if (cmp(pending[0], current[1]) <= 0) {
          if (cmp(pending[0], current[0]) < 0) {
            // Expand left (changed).
            changed = current[0] = pending[0];
          }
          if (cmp(pending[1], current[1]) > 0) {
            // Expand right (changed).
            changed = current[1] = pending[1];
          }
          if (ranges[i + 1]?.[0] < current[1]) {
            // Detach the current range since it is to be merged with the next.
            changed = pending = ranges.splice(i--, 1)[0];
          } else {
            // Only update the total width if the current range was expanded or merged.
            return finalize(changed != null);
          }
        }
      }

      // If there still is a pending range it means its start comes after the current end.
      // Only update width in that case.
      return finalize(pending && (ranges[ranges.length] = pending));
    },
    width: 0,
  }) as any;
};
