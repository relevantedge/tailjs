import {
  add2,
  assign2,
  clone2,
  forEach2,
  get2,
  map2,
  obj2,
  sort2,
  stop2,
  topoSort,
  TRUISH,
  update2,
} from "@tailjs/util";

type Item = [id: string, deps?: Item[]];

describe("iterators(2)", () => {
  it("Maps and eaches", () => {
    expect(map2([1, 2, 3, 4], (x) => x)).toEqual([1, 2, 3, 4]);
    expect(map2([1, 2, 3, 4], (x) => (x === 3 ? stop2() : x))).toEqual([1, 2]);
    expect(map2([1, 2, 3, 4], (x) => (x === 3 ? stop2(x) : x))).toEqual([
      1, 2, 3,
    ]);
    expect(map2([1, 2, 3, 4], (x) => x)).toEqual([1, 2, 3, 4]);

    expect(map2({ a: "test", b: 20 })).toEqual([
      ["a", "test"],
      ["b", 20],
    ]);

    expect(
      map2({ a: "test", b: 20 }, ([key, value]) => [key, value, 1])
    ).toEqual([
      ["a", "test", 1],
      ["b", 20, 1],
    ]);

    expect(
      map2((current = 0) => (current < 3 ? current + 1 : undefined))
    ).toEqual([1, 2, 3]);

    expect(
      map2(
        (current = 0) => (current < 3 ? current + 1 : undefined),
        (item) => (item === 2 ? stop2(2) : item)
      )
    ).toEqual([1, 2]);

    expect(map2(4)).toEqual([0, 1, 2, 3]);
    expect(map2(4, TRUISH)).toEqual([1, 2, 3]);

    expect(
      forEach2([1, 2, 3, 2], (item, index, prev: number = 0) =>
        item > prev ? item : prev
      )
    ).toBe(3);

    const testMap = new Map<number, string>();
    testMap.set(10, "ok");
    testMap.set(20, "ok2");
    expect(forEach2(testMap)).toEqual([20, "ok2"]);
  });
  it("Sorts normally", () => {
    expect(sort2(["a", "c", "b", 10])).toEqual([10, "a", "b", "c"]);
    expect(sort2(["a", "c", undefined, "b", 10, null])).toEqual([
      null,
      10,
      "a",
      "b",
      "c",
      // ES sort always puts undefined entries last.
      undefined,
    ]);
  });

  it("Assigns", () => {
    expect(assign2({ a: 32 }, [["b", true]] as const)).toEqual({
      a: 32,
      b: true,
    });
    expect(assign2({ a: 32 }, [["b", true]] as const, { b: "ok" })).toEqual({
      a: 32,
      b: "ok",
    });
  });

  it("Makes objects", () => {
    expect(obj2([["b", true]] as const)).toEqual({ b: true });

    expect(obj2(3, (item) => [item, true])).toEqual({
      0: true,
      1: true,
      2: true,
    });

    let target = { a: 32, b: 90 };
    expect(
      obj2(target, ([key]) => (key === "b" ? undefined : [key, 80]), target)
    ).toEqual({
      a: 80,
      b: 90,
    });
  });

  it("Clones", () => {
    const x = { a: 32, b: ["a", ["b", "c"]] };
    expect(clone2(x)).not.toBe(x);
    expect(clone2(x)).toEqual(x);

    expect(clone2(x)["b"][1] === x["b"][1]).toBe(false);
    expect(clone2(x, 0)["b"] === x["b"]).toBe(true);
    expect(clone2(x, 1)["b"][1] === x["b"][1]).toBe(true);
  });

  it("Does map and set things", () => {
    const s = new Set<string>();
    expect(add2(s, "1")).toBe(true);
    expect(add2(s, "2")).toBe(true);
    expect(add2(s, "1")).toBe(false);

    const m = new Map<string, number>();
    expect(get2(m, "1")).toBeUndefined();
    expect(get2(m, "1", () => undefined)).toBeUndefined();
    expect(get2(m, "1", () => 80)).toBe(80);
    expect(get2(m, "2")).toBeUndefined();
    expect(m.get("1")).toBe(80);

    expect(update2(m, "1", (current) => current! + 1)).toBe(81);
    expect(update2(m, "2", 90)).toBe(90);

    expect(m.size).toBe(2);
    update2(m, "2", () => undefined);
    expect(m.size).toBe(1);
    update2(m, "3", undefined);
    expect(m.size).toBe(1);
    update2(m, "1", undefined);
    expect(m.size).toBe(0);
  });

  it("Sort topologically", () => {
    const item1: Item = ["1"];
    const item11: Item = ["1.1", [item1]];
    const item111: Item = ["1.1.1", [item11]];

    const item12: Item = ["1.2", [item1]];
    const item121: Item = ["1.2.1", [item1, item12]];
    const item122: Item = ["1.2.2", [item12]];
    const item13: Item = ["1.3", [item1]];

    const item2: Item = ["2"];
    const item21: Item = ["2.1", [item111]];

    expect(topoSort([item1, item11, item2], (item) => item[1])).toEqual([
      item1,
      item2,
      item11,
    ]);

    expect(
      // Item 1.2 omitted, so item121 only depends on item 1.1 and item122 is a root item.
      topoSort(
        [item13, item111, item2, item21, item11, item1, item122, item121],
        (item) => item[1]
      )
    ).toEqual([
      item2,
      item1,
      item122,
      item13,
      item11,
      item121,
      item111,
      item21,
    ]);

    const itemC1: Item = ["C1", []];
    const itemC12: Item = ["C12", [itemC1]];
    const itemC121: Item = ["C121", [itemC12]];
    itemC1[1]!.push(itemC121);
    expect(
      // Item 1.2 omitted, so item121 only depends on item 1.1 and item122 is a root item.
      () => topoSort([itemC1, itemC12, itemC121], (item) => item[1])
    ).toThrow("Cyclic");
  });
});
