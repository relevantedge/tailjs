import {
  count,
  every,
  filter,
  flatForEach,
  flatMap,
  flatProject,
  forEach,
  map,
  project,
  reduce,
  some,
  sum,
  toObject,
} from "../src";

describe("Iterator functionality iterates iterably", () => {
  function* test123() {
    yield 1;
    yield 2;
    yield 3;
  }

  const testSet = new Set<number>([1, 2, 3]);
  const testMap = new Map<string, number>([
    ["a", 1],
    ["b", 9],
  ]);

  it("Makes ranges", () => {
    expect(map(4)).toEqual([0, 1, 2, 3]);
    expect(map(6, (i) => (i % 2 ? i : undefined))).toEqual([1, 3, 5]);
    expect(map(5, null, 2)).toEqual([2, 3, 4, 5, 6]);
  });

  it("Projects iterables.", () => {
    expect(map(["a", "b", "c"])).toEqual(["a", "b", "c"]);
    expect(map("abc")).toEqual(["a", "b", "c"]);

    expect(map(test123())).toEqual([1, 2, 3]);
  });

  it("Projects objects.", () => {
    expect(map({ a: 1, b: 2 })).toEqual([
      ["a", 1],
      ["b", 2],
    ]);

    expect(map({ a: 1, b: 2 }, ([, value]) => value)).toEqual([1, 2]);
    expect(map(testSet)).toEqual([1, 2, 3]);
    expect(map(testMap)).toEqual([
      ["a", 1],
      ["b", 9],
    ]);
    expect(map(testMap, ([key, value]) => key)).toEqual(["a", "b"]);
  });

  it("Counts", () => {
    expect(count([1, 2, 3])).toBe(3);
    expect(count("abcd")).toBe(4);
    expect(count(test123())).toBe(3);
    expect(count("abcd", (p) => p === "c")).toBe(1);

    expect(count(testSet)).toBe(3);
  });

  it("Reduces", () => {
    expect(
      reduce(test123(), (max, value) => (value > max ? value : max), 10)
    ).toBe(10);
    expect(
      reduce(test123(), (max, value) =>
        max == null || value > max ? value : max
      )
    ).toBe(3);
    expect(
      reduce([], (max, value) => (max == null || value > max ? value : max))
    ).toBe(undefined);

    expect(sum(test123())).toBe(6);
    expect(sum(["a", "bc"], (s) => s.length)).toBe(3);
  });

  it("Maps iterators to objects with properties", () => {
    expect(toObject({ a: 32, b: "test" })).toEqual({ a: 32, b: "test" });
    expect(
      toObject([
        ["a", 32],
        ["b", "test"],
      ])
    ).toEqual({ a: 32, b: "test" });

    expect(toObject(3, (x) => (x > 1 ? ["a", x] : [x, "b"]))).toEqual({
      a: 2,
      0: "b",
      1: "b",
    });
  });

  it("Evaluates every/some correctly", () => {
    expect(some("abc", (p) => p === "c")).toBe(true);
    expect(every("abc", (p) => p === "c")).toBe(false);
    expect(every("abc", (p) => p !== "k")).toBe(true);
    expect(some([1, 2, 3])).toBe(true);
    expect(some([])).toBe(false);
    expect(every([], (p) => false)).toBe(true);
  });

  it("Skips", () => {
    const dummy = ["A", "B", "C", "D", "E"];
    expect(
      map(dummy, (value, i, { skip }) => (i > 1 ? value : skip()))
    ).toEqual(["C", "D", "E"]);

    expect(
      forEach([1], (item, index, { skip }) => (index ? true : skip())) ?? false
    ).toEqual(false);
    expect(
      forEach([1, 2], (item, index, { skip }) => (index ? true : skip())) ??
        false
    ).toEqual(true);

    expect(map([1, 2, 3], null, 1, 2)).toEqual([2]);
    expect(map([1, 2, 3], 1, 2)).toEqual([2]);
  });

  it("Iterates navigator functions", () => {
    expect(
      map((prev: number) => (prev > 4 ? undefined : prev + 1), null, 0)
    ).toEqual([0, 1, 2, 3, 4, 5]);

    expect(
      map((prev) => (prev > 4 ? undefined : prev + 1), null, 2, 1)
    ).toEqual([2, 3]);
  });

  it("Returns", () => {
    expect(forEach(3, (value) => value)).toEqual(2);
    expect(forEach(1, (value, _, { end }) => end(value))).toEqual(0);
    expect(forEach(1, (value, _, { end }) => end())).toEqual(undefined);
  });

  it("Filters", () => {
    expect(filter(3, (n) => n % 2, true)).toEqual([1]);
    expect(filter([1, 2, null, 3])).toEqual([1, 2, 3]);
  });

  it("Flattens", () => {
    expect(flatMap([{ a: 10 }, { b: 20, c: true }])).toEqual([
      ["a", 10],
      ["b", 20],
      ["c", true],
    ]);
    expect(flatMap([[1, 2, 3], 4, [5, 6]], (item) => item)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);

    expect(flatForEach(2, (i) => [i, -i])).toEqual([1, -1]);
    expect(
      flatForEach(
        project(2, (i) => [i, -i]),
        (i) => i
      )
    ).toEqual(-1);
  });
});
