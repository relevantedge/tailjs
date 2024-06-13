import { createChainedEvent, createIntervals } from "../src";

describe("intervals.ts", () => {
  it("Inserts intervals correctly", () => {
    const intervals = createIntervals();
    expect(intervals.length).toBe(0);
    expect(intervals.width).toBe(0);

    expect(intervals.push(0, 10)).toBe(10);
    // Appended:
    expect([...intervals]).toEqual([[0, 10]]);
    expect(intervals.push(20, 30)).toBe(20);

    // Appended:
    expect([...intervals]).toEqual([
      [0, 10],
      [20, 30],
    ]);

    // No change:
    expect(intervals.push(5, 10)).toBe(20);
    expect([...intervals]).toEqual([
      [0, 10],
      [20, 30],
    ]);

    // Expand first:
    expect(intervals.push(5, 15)).toBe(25);
    expect([...intervals]).toEqual([
      [0, 15],
      [20, 30],
    ]);

    // Expand second:
    expect(intervals.push(30, 40)).toBe(35);
    expect([...intervals]).toEqual([
      [0, 15],
      [20, 40],
    ]);

    // Expand second backwards:
    expect(intervals.push(16, 20)).toBe(39);
    expect([...intervals]).toEqual([
      [0, 15],
      [16, 40],
    ]);

    // Merge:
    expect(intervals.push(12, 23)).toBe(40);
    expect([...intervals]).toEqual([[0, 40]]);

    // Four intervals, merge three first.
    intervals.push(41, 42);
    intervals.push(43, 45);
    intervals.push(46, 50);
    expect(intervals.length).toBe(4);
    intervals.push(4, 44);
    expect(intervals.length).toBe(2);
    // 50 minus the gap of one between 45 and 46.
    expect(intervals.width).toBe(49);
  });
});
