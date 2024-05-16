import {
  apply,
  concat,
  count,
  every,
  expand,
  filter,
  flatForEach,
  flatMap,
  forEach,
  map,
  obj,
  project,
  reduce,
  some,
  stop,
  sum,
  unarray,
} from "../src";

describe("iterators.ts", () => {
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

  it("Projects iterables", () => {
    expect(map(["a", "b", "c"])).toEqual(["a", "b", "c"]);
    expect(map("abc")).toEqual(["a", "b", "c"]);

    expect(map(test123())).toEqual([1, 2, 3]);
  });

  it("Projects objects", () => {
    expect(map({ a: 1, b: 2 })).toEqual([
      ["a", 1],
      ["b", 2],
    ]);

    expect(map([{ a: 1, b: 2 }, { b: 3 }, { a: "hello" }], "a")).toEqual([
      1,
      "hello",
    ]);

    expect(
      map(
        [
          [0, 1],
          [3, 4],
        ],
        0
      )
    ).toEqual([0, 3]);

    expect(map({ a: 1, b: 2 }, ([, value]) => value)).toEqual([1, 2]);
    expect(map(testSet)).toEqual([1, 2, 3]);
    expect(map(testMap)).toEqual([
      ["a", 1],
      ["b", 9],
    ]);
    expect(map(testMap, ([key, value]) => key)).toEqual(["a", "b"]);
  });

  it("For-eaches over all supported types", () => {
    expect(forEach([1, 2, 3], (value) => value)).toEqual(3);
    expect(
      forEach([1, 2, 3], (value) => (value === 3 ? undefined : value))
    ).toEqual(2);
    expect(
      forEach([1, 2, 3], (value) => (value === 2 ? stop() : value))
    ).toEqual(1);
    expect(
      forEach([1, 2, 3], (value) => (value === 2 ? stop(99) : value))
    ).toEqual(99);

    expect(
      forEach({ a: 1, b: 2, c: 3 }, ([key, value]) => [key, value])
    ).toEqual(["c", 3]);

    expect(
      forEach({ a: 1, b: 2, c: 3 }, ([key, value]) =>
        key === "c" ? undefined : [key, value]
      )
    ).toEqual(["b", 2]);

    expect(
      forEach({ a: 1, b: 2, c: 3 }, ([key, value]) =>
        key === "b" ? stop() : [key, value]
      )
    ).toEqual(["a", 1]);

    expect(
      forEach({ a: 1, b: 2, c: 3 }, ([key, value]) =>
        key === "b" ? stop(99) : [key, value]
      )
    ).toEqual(99);

    expect(forEach(test123(), (value) => value)).toEqual(3);
    expect(
      forEach(test123(), (value) => (value === 3 ? undefined : value))
    ).toEqual(2);
    expect(
      forEach(test123(), (value) => (value === 2 ? stop() : value))
    ).toEqual(1);
    expect(
      forEach(test123(), (value) => (value === 2 ? stop(99) : value))
    ).toEqual(99);

    expect(
      forEach(
        new Map([
          ["a", 1],
          ["b", 2],
          ["c", 3],
        ]),
        ([key, value]) => [key, value]
      )
    ).toEqual(["c", 3]);

    expect(forEach(4, (value) => value)).toEqual(3);
    expect(forEach(4, (value) => (value === 3 ? undefined : value))).toEqual(2);
    expect(forEach(4, (value) => (value === 2 ? stop() : value))).toEqual(1);
    expect(forEach(4, (value) => (value === 2 ? stop(99) : value))).toEqual(99);
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
    expect(
      obj([
        ["a", 32],
        ["b", "test"],
      ])
    ).toEqual({ a: 32, b: "test" });

    expect(obj({ a: 32, b: "test" })).toEqual({ a: 32, b: "test" });

    const kvs = new Map<string, string>([
      ["a", "32"],
      ["b", "test"],
    ]);

    expect(obj(kvs)).toEqual({ a: "32", b: "test" });
    expect(obj([{ a: 32, b: "test" }], false)).toEqual({ a: 32, b: "test" });
    expect(obj([{ a: 32, b: "test" }, [["c", 80]], kvs], false)).toEqual({
      a: "32",
      b: "test",
      c: 80,
    });

    expect(obj([{ a: 32, b: "test" }, [["b", "gazonk"]]], true)).toEqual({
      a: [32],
      b: ["test", "gazonk"],
    });

    expect(obj(3, (x) => (x > 1 ? ["a", x] : [x, "b"]))).toEqual({
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
    expect(map(dummy, (value, i) => (i > 1 ? value : undefined))).toEqual([
      "C",
      "D",
      "E",
    ]);

    expect(
      forEach([1], (item, index) => (index ? true : undefined)) ?? false
    ).toEqual(false);
    expect(
      forEach([1, 2], (item, index) => (index ? true : undefined)) ?? false
    ).toEqual(true);

    expect(map([1, 2, 3], null, 1, 2)).toEqual([2]);
  });

  it("Iterates navigator functions", () => {
    expect(
      map((prev: number) => (prev > 4 ? undefined : prev + 1), null, 0)
    ).toEqual([0, 1, 2, 3, 4, 5]);

    expect(
      map((prev: number) => (prev > 4 ? undefined : prev + 1), null, 2, 1)
    ).toEqual([2, 3]);
  });

  it("Returns", () => {
    expect(forEach(3, (value) => value)).toEqual(2);
    expect(forEach(1, (value, _) => stop(value))).toEqual(0);
    expect(forEach(1, (value, _) => stop())).toEqual(undefined);
  });

  it("Filters", () => {
    expect(filter(3, (n) => n % 2, true)).toEqual([1]);
    expect(filter([1, 2, null, 3])).toEqual([1, 2, 3]);
  });

  it("Flattens", () => {
    // expect(flatMap([{ a: 10 }, { b: 20, c: true }], (x) => x)).toEqual([
    //   { a: 10 },
    //   { b: 20, c: true },
    // ]);

    expect(flatMap([{ a: 10 }, { b: 20, c: true }], (x) => x, 1, true)).toEqual(
      [
        ["a", 10],
        ["b", 20],
        ["c", true],
      ]
    );

    expect(flatMap([{ a: [1, 2, 3] }, { b: 32 }, { a: [4] }], "a")).toEqual([
      1, 2, 3, 4,
    ]);

    expect(concat(map([{ a: [1, 2, 3] }, { b: 32 }, { a: [4] }], "a"))).toEqual(
      [1, 2, 3, 4]
    );

    expect(
      unarray(map([{ a: [1, 2, 3] }, { b: 32 }, { a: [4] }], "a"), 5)
    ).toEqual([1, 2, 3, 4, 5]);

    expect(flatMap([[1, [2], 3], 4, [5, 6]], (item) => item, 0)).toEqual([
      [1, [2], 3],
      4,
      [5, 6],
    ]);

    expect(flatMap([[1, [2], 3], 4, [5, 6]], (item) => item)).toEqual([
      1,
      [2],
      3,
      4,
      5,
      6,
    ]);

    expect(flatMap([[1, [2], 3], 4, [5, 6]], (item) => item, 3)).toEqual([
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

  it("expands", () => {
    type Nested = {
      name: string;
      children?: Nested[];
    };

    const test: Nested = {
      name: "test1",
      children: [
        { name: "test1.1", children: [{ name: "test1.1.1" }] },
        { name: "test1.2" },
      ],
    };
    expect(
      map(
        expand(test, (item) => item.children, true),
        (item) => item.name
      )
    ).toEqual(["test1", "test1.1", "test1.1.1", "test1.2"]);

    expect(
      map(
        expand(test, (item) => item.children, false),
        (item) => item.name
      )
    ).toEqual(["test1.1", "test1.1.1", "test1.2"]);
  });

  it("Applies", () => {
    const test = (n: number, add = 1) => n + add;

    expect(apply([0, 1, 2], test)).toEqual([1, 2, 3]);
    expect(apply([0, 1, 2], test, 10)).toEqual([10, 11, 12]);
    expect(apply(3, test, 10)).toEqual(13);
  });
});
