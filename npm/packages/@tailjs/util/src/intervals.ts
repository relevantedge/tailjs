import { assign, forEach, some, sum } from ".";

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

  return assign(ranges, {
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
