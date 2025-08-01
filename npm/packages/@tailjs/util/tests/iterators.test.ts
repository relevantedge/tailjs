import {
  all,
  array,
  avg,
  clone,
  itemize,
  filter,
  flatMap,
  forEach,
  forEachAwait,
  get,
  group,
  indent,
  map,
  mapAwait,
  max,
  merge,
  min,
  obj,
  pick,
  set,
  skip,
  some,
  sort,
  stop,
  sum,
  topoSort,
  update,
  join,
  concat,
  add,
  count,
  last,
  first,
  assign,
} from "@tailjs/util";

type Item = [id: string, deps?: Item[]];

describe("iterators(2)", () => {
  it("Maps and eaches", () => {
    expect(map([1, 2, 3, 4], (x) => x)).toEqual([1, 2, 3, 4]);
    expect(map([1, 2, 3, 4], (x) => (x === 3 ? stop : x))).toEqual([1, 2]);
    expect(map([1, 2, 3, 4], (x) => (x === 3 ? stop(x) : x))).toEqual([
      1, 2, 3,
    ]);
    expect(map([1, 2, 3, null, 4], (x) => x)).toEqual([1, 2, 3, null, 4]);

    expect(map({ a: "test", b: 20 })).toEqual([
      ["a", "test"],
      ["b", 20],
    ]);

    expect(
      map({ a: "test", b: 20 }, ([key, value]) => [key, value, 1])
    ).toEqual([
      ["a", "test", 1],
      ["b", 20, 1],
    ]);

    expect(
      map((current = 0) => (current < 3 ? current + 1 : undefined))
    ).toEqual([1, 2, 3]);

    expect(
      map(
        (current = 0) => (current < 3 ? current + 1 : undefined),
        (item) => (item === 2 ? stop(2) : item)
      )
    ).toEqual([1, 2]);

    expect(map(4)).toEqual([0, 1, 2, 3]);
    expect(map(4, (x) => x || skip)).toEqual([1, 2, 3]);

    expect(
      forEach([1, 2, 3, 2], (item, index, prev: number = 0) =>
        item > prev ? item : prev
      )
    ).toBe(3);

    expect(map("hello")).toEqual(["h", "e", "l", "l", "o"]);
    expect(map("")).toEqual([]);
    expect(map(0)).toEqual([]);
    expect(map(false)).toBeUndefined();
    expect(map("Lol💀")).toEqual(["L", "o", "l", "💀"]);

    const testMap = new Map<number, string>();
    testMap.set(10, "ok");
    testMap.set(20, "ok2");
    expect(forEach(testMap)).toEqual([20, "ok2"]);

    type Childish = { id: number; parent?: Childish };
    const x: Childish = { id: 0 };
    const y: Childish = { id: 1, parent: x };
    const z: Childish = { id: 2, parent: y };
    expect(map((current: Childish) => (current ? current.parent : z))).toEqual([
      z,
      y,
      x,
    ]);
    expect(
      map(
        (current: Childish) => (current ? current.parent : z),
        (item) => (item === y ? stop(x) : item)
      )
    ).toEqual([z, x]);
  });

  it("Filters", () => {
    expect(filter([0, 1, null, 2], false)).toEqual([1, 2]);
    expect(filter([0, 1, null, 2], true)).toEqual([0, 1, 2]);
    expect(filter([0, 1, null, 2])).toEqual([0, 1, 2]);

    expect(filter([0, 1, null, 2], new Set([2]))).toEqual([2]);
    expect(filter([0, 1, null, 2], new Set([2]), true)).toEqual([0, 1]);
    expect(filter([0, 1, null, 2], (x) => x == null)).toEqual([null]);
    expect(filter([0, 1, null, 2], (x) => x == null, true)).toEqual([0, 1, 2]);

    expect(first([0, 1, 2])).toBe(0);
    expect(first([0, 1, 2], (x) => x)).toBe(1);

    expect(last([0, 1, 2])).toBe(2);
    expect(last([0, 1, 2], (x) => x < 2)).toBe(1);
  });

  it("Sorts", () => {
    expect(sort(["a", "c", "b", 10])).toEqual([10, "a", "b", "c"]);
    expect(sort(["a", "c", "b", 10], true)).toEqual(["c", "b", "a", 10]);
    expect(sort(["a", "c", undefined, "b", 10, null])).toEqual([
      null,
      10,
      "a",
      "b",
      "c",
      // ES sort always puts undefined entries last.
      undefined,
    ]);

    expect(sort(["a", "c", "b", 10], (x) => x, true)).toEqual([
      "c",
      "b",
      "a",
      10,
    ]);
    expect(sort(["a", "c", "b"], [])).toEqual(["a", "b", "c"]); // No selectors, sort by value.
    expect(sort(["a", "c", "b"], [], true)).toEqual(["c", "b", "a"]); // No selectors, sort by value.

    expect(sort(["a", "c", "b", 10], [(x) => x, (x) => x], true)).toEqual([
      "c",
      "b",
      "a",
      10,
    ]);

    // Multi-property sort:
    expect(
      sort(
        [
          { a: 10, b: 0 },
          { a: 0, b: 10 },
          { a: 10, b: -1 },
        ],
        [(item) => item.a, (item) => item.b]
      )
    ).toEqual([
      { a: 0, b: 10 },
      { a: 10, b: -1 },
      { a: 10, b: 0 },
    ]);
  });

  it("Assigns", () => {
    let target: any = { a: 10 };
    let updated = assign(target, { a: 20, b: "ok" });

    expect(target).toBe(updated);
    expect(target["a"]).toBe(20);
    expect(target["b"]).toBe("ok");

    updated = assign((target = updated), { a: undefined, b: undefined });
    expect(target).toBe(updated);
    expect(target).toEqual({});

    target = { a: 10 };
    updated = assign(target, false, { a: 10 });
    expect(target).toBe(updated);
    updated = assign(target, true, { a: 10 });
    expect(target).toBe(updated);

    updated = assign(target, true, { a: 20 });
    expect(target).not.toBe(updated);
    expect(updated["a"]).toBe(20);

    target = { a: 10, b: 20 };
    updated = assign(target, true, { a: 10, b: undefined });
    expect(target).not.toBe(updated);
    expect(updated).toEqual({ a: 10 });

    target = new Map([["a", 10]]);
    updated = assign(
      target,
      true,
      { a: 20 },
      { a: 80 },
      { b: 10 },
      { a: 90, b: undefined }
    );

    expect(target).toBe(updated);
    expect(target.get("a")).toBe(90);
    expect(target.has("b")).toBe(false);
  });

  it("Merges", () => {
    expect(merge({ a: 32 }, [[["b", true]]])).toEqual({
      a: 32,
      b: true,
    });
    expect(merge({ a: 32 }, [[["b", true]] as const, { b: "ok" }])).toEqual({
      a: 32,
      b: "ok",
    });

    // No merge, overwrite (three variations):
    expect(
      merge({ a: 32, b: { a: 80 }, c: true }, { b: { b: 43 } }, { deep: false })
    ).toEqual({
      a: 32,
      b: { b: 43 },
      c: true,
    });
    expect(
      merge({ a: 32, b: { a: 80 }, c: true }, { b: { b: 43 } }, { deep: false })
    ).toEqual({
      a: 32,
      b: { b: 43 },
      c: true,
    });

    expect(
      merge(
        { a: 32, b: { a: 80 }, c: true },
        { b: { b: 43 } },
        { deep: false, overwrite: true }
      )
    ).toEqual({
      a: 32,
      b: { b: 43 },
      c: true,
    });

    // Merge, overwrite (two variations):
    expect(
      merge(
        {
          a: 32,
          b: { a: 80, nested: { g: "test", i: 80 } },
          c: true,
          e: { ok: true },
        },
        [
          {
            b: { b: 43, nested: { g: "replace", h: "abc" } },
            c: false,
            d: 79,
            e: undefined,
          },
        ],
        {
          deep: true,
        }
      )
    ).toEqual({
      a: 32,
      b: { a: 80, b: 43, nested: { g: "replace", h: "abc", i: 80 } },
      c: false,
      d: 79,
    });

    let merged: any;
    expect(
      (merged = merge(
        {
          a: 32,
          b: { a: 80, nested: { g: "test", i: 80 } },
          c: true,
          e: { ok: true },
        },
        {
          b: { b: 43, nested: { g: "replace", h: "abc" } },
          c: false,
          d: 79,
          e: undefined,
        },
        { deep: true, overwrite: true }
      ))
    ).toEqual({
      a: 32,
      b: { a: 80, b: 43, nested: { g: "replace", h: "abc", i: 80 } },
      c: false,
      d: 79,
    });

    expect(
      merge({ a: "test", b: null }, { a: "test2", b: 20 }, { overwrite: false })
    ).toEqual({ a: "test", b: null });
    expect(
      merge(
        { a: "test", b: null },
        { a: "test2", b: 20 },
        { overwrite: false, nulls: true }
      )
    ).toEqual({ a: "test", b: 20 });

    expect(merged["e"]).toBeUndefined();

    // No overwrite (merge / no merge)
    expect(
      (merged = merge(
        {
          a: 32,
          b: { a: 80, nested: { g: "test", i: 80 } },
          c: true,
          e: { ok: true },
        },
        {
          b: { b: 43, nested: { g: "replace", h: "abc" } },
          c: false,
          d: 79,
          e: undefined,
        },
        {
          deep: true,
          overwrite: false,
        }
      ))
    ).toEqual({
      a: 32,
      b: { a: 80, b: 43, nested: { g: "test", h: "abc", i: 80 } },
      c: true,
      d: 79,
      e: { ok: true },
    });
    expect("e" in merged).toBe(true);

    expect(
      merge(
        {
          a: 32,
          b: { a: 80, nested: { g: "test", i: 80 } },
          c: true,
          e: { ok: true },
        },
        {
          b: { b: 43, nested: { g: "replace", h: "abc" } },
          c: false,
          d: 79,
        },
        {
          deep: false,
          overwrite: false,
        }
      )
    ).toEqual({
      a: 32,
      b: { a: 80, nested: { g: "test", i: 80 } },
      c: true,
      d: 79,
      e: { ok: true },
    });
  });

  it("Somes and alls", () => {
    expect(some([1, 2, 3])).toBe(true);
    expect(some([0, false, null, undefined])).toBe(false);
    expect(some([])).toBe(false);

    expect(some([0, "", 0, 0], (item, i, prev) => i >= 1 && prev === "")).toBe(
      true
    );

    expect(all([1, 2, 3])).toBe(true);
    expect(all([0, 1, 2, 3])).toBe(false);
    expect(all([])).toBe(true);

    expect(all([0, "", 0, 0], (item, i, prev) => i !== 2 || prev === "")).toBe(
      true
    );
  });

  it("Makes objects", () => {
    expect(obj([["b", true]] as const)).toEqual({ b: true });

    expect(obj(3, (item) => [item, true])).toEqual({
      0: true,
      1: true,
      2: true,
    });

    let target = { a: 32, b: 90 };
    expect(
      obj(target, ([key]) => (key === "b" ? undefined : [key, 80]))
    ).toEqual({
      a: 80,
    });
  });

  it("Groups", () => {
    expect(
      array(
        group([
          [1, 1],
          [1, 2],
          [2, 3],
        ])
      )
    ).toEqual([
      [1, [1, 2]],
      [2, [3]],
    ]);

    expect(
      group(
        [
          [1, 1],
          [1, 2],
          [2, 3],
        ],
        false
      )
    ).toEqual({ 1: [1, 2], 2: [3] });

    expect(array(group(3, (n) => [n < 2 ? 1 : 2, n + 1]))).toEqual([
      [1, [1, 2]],
      [2, [3]],
    ]);

    expect(group(3, (n) => [n < 2 ? 1 : 2, n + 1], false)).toEqual({
      1: [1, 2],
      2: [3],
    });
  });

  it("Picks", () => {
    expect(pick({ a: 32, b: "80", d: null }, ["b", "d"])).toEqual({
      b: "80",
      d: null,
    });

    expect(
      pick(
        { a: 32, b: "80", c: undefined } as {
          a: number;
          b: string;
          c?: string;
          d?: string;
        },
        ["b", "d"]
      )
    ).toEqual({
      b: "80",
      c: undefined,
    });
  });

  it("Clones", () => {
    const x = { a: 32, b: ["a", ["b", "c"]] };
    expect(clone(x)).not.toBe(x);
    expect(clone(x)).toEqual(x);

    expect(clone(x)["b"][1] === x["b"][1]).toBe(false);
    expect(clone(x, 0)["b"] === x["b"]).toBe(true);
    expect(clone(x, 1)["b"][1] === x["b"][1]).toBe(true);
  });

  it("Does map and set things", () => {
    const s = new Set<string>();
    // expect(toggle2(s, "1")).toBe(true);
    // expect(toggle2(s, "2")).toBe(true);
    // expect(toggle2(s, "1")).toBe(false);

    const m = new Map<string, number>();

    expect(get(m, "1")).toBeUndefined();
    expect(get(m, "1", () => undefined)).toBeUndefined();
    expect(get(m, "1", () => 80)).toBe(80);
    expect(get(m, "2")).toBeUndefined();
    expect(m.get("1")).toBe(80);

    expect(update(m, "1", (current) => current! + 1)).toBe(81);

    expect(set(m, "2", 90)).toBe(90);

    expect(m.size).toBe(2);
    update(m, "2", () => undefined);
    expect(m.size).toBe(1);
    set(m, "3", undefined);
    expect(m.size).toBe(1);
    set(m, "1", undefined);
    expect(m.size).toBe(0);

    const o: { a: number; b?: string } = { a: 10 };
    expect(update(o, "a", (current) => current + 1)).toBe(11);
    expect(o).toEqual({ a: 11 });
    expect(update(o, "b", (current) => (current ? "fail" : "ok"))).toBe("ok");
    expect(o).toEqual({ a: 11, b: "ok" });

    const addTest = new Set<string>();
    expect(add(addTest, "123")).toBe(true);
  });

  it("Flat maps", () => {
    expect(flatMap([1, 2, 3])).toEqual([1, 2, 3]);
    expect(flatMap([1, 2, [3, 4]], undefined, 1)).toEqual([1, 2, 3, 4]);
    expect(flatMap([1, 2, [3, 4]], undefined, 0)).toEqual([1, 2, [3, 4]]);
    expect(flatMap({ gg: 80 })).toEqual(["gg", 80]);
    expect(flatMap({ gg: [1, 2], p: { ok: 10 } })).toEqual([
      "gg",
      1,
      2,
      "p",
      { ok: 10 },
    ]);
    expect(flatMap(2, (x) => [x, [1, x]], -1, [2])).toEqual([
      2, 0, 1, 0, 1, 1, 1,
    ]);
    expect(flatMap(2, (x) => (x ? stop : [x, [1, x]]), -1, [2])).toEqual([
      2, 0, 1, 0,
    ]);

    expect(
      flatMap((x = [1, 2, 3, 4]) => (x.length ? x.slice(0, -1) : undefined))
    ).toEqual([1, 2, 3, 1, 2, 1]);

    expect(
      flatMap({ a: 1, b: [2, 3] }, (kv) =>
        Array.isArray(kv[1]) ? kv[1] : kv[1]
      )
    ).toEqual([1, 2, 3]);
  });

  it("Min, max, sum, etc.", () => {
    expect(min([1, 3, 2])).toBe(1);
    expect(max([1, 3, 2])).toBe(3);
    expect(sum([1, 3, 2])).toBe(6);
    expect(avg([1, 3, 2])).toBe(2);

    expect(count([1, 2, 3])).toBe(3);
    expect(count([1, 2, 3], (x) => x > 1)).toBe(2);

    const x = { n: 10 };
    const y = { n: 5 };
    const z = { n: 10 };
    expect(max([x, y, z], (item) => item.n, true)).toBe(x);
  });

  it("Enumerates", () => {
    expect(itemize([1, 2, 3])).toBe("1, 2 and 3");
    expect(itemize([1, 2, "", 3, ""])).toBe("1, 2 and 3");
    expect(itemize([1, 2, 3, null, 4], (x) => x && "Item " + x)).toBe(
      "Item 1, Item 2, Item 3 and Item 4"
    );
    expect(itemize([1, 2, 3, null, 4], "or")).toBe("1, 2, 3 or 4");
    expect(itemize([1, 2, 3, null, 4], [",", "or"])).toBe("1, 2, 3 or 4");
    expect(itemize([1, 2, 3, null, 4], ", or")).toBe("1, 2, 3, or 4");
    expect(
      itemize(
        [1, 2, 3, null, 4],
        (x) => x && x + 1,
        ["+", "+ or"],
        (s, n) => n + ": " + s
      )
    ).toBe("4: 2+ 3+ 4+ or 5");

    expect(itemize([1, 2, 3], [";", ""])).toBe("1; 2 3");
  });

  it("Joins", () => {
    expect(join(0)).toBe("0");
    expect(join("abc")).toBe("abc");
    expect(join(["test", "", 0, "x", null, false])).toBe("test0x");
    expect(join([])).toBe("");
    expect(join([1])).toBe("1");
    expect(join([1, 2], "-")).toBe("1-2");
    expect(join(null)).toBe(null);
    expect(join(undefined)).toBe(undefined);
    expect(join(false)).toBe("");
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

    expect(
      topoSort(
        [item1, item11, item2],
        (item) => item[1],
        (item) => item[0]
      )
    ).toEqual([item1, item2, item11]);

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
      () => topoSort([itemC1, itemC12, itemC121], (item) => item[1], 0)
    ).toThrow("Cyclic");

    expect(
      topoSort(
        sort([item13, item2, item12, item121, item1], (item) => item[0]),
        (item) => item[1]
      )
    ).toEqual([item1, item2, item12, item13, item121]);
  });

  it("Indents", () => {
    let s: string;
    expect((s = indent("This is\na test\r\nyes"))).toBe(
      "  This is\n  a test\r\n  yes"
    );
    expect(
      (s = indent(`
      already
        indented
    weird
      
      line
      `))
    ).toBe("\n  already\n    indented\n  weird\n\n  line\n");
  });

  it("Asyncs", async () => {
    async function* asyncIt() {
      yield 1;
      yield 2;
      yield Promise.resolve(3);
    }

    await expect(forEachAwait(asyncIt())).resolves.toBe(3);
    await expect(forEachAwait([1, 2, 3])).resolves.toBe(3);
    await expect(forEachAwait(asyncIt(), (x) => x + 1)).resolves.toBe(4);
    await expect(forEachAwait(asyncIt(), async (x) => x + 1)).resolves.toBe(4);
    await expect(
      forEachAwait(asyncIt(), (x) => (x === 2 ? Promise.resolve(x) : x + 1))
    ).resolves.toBe(4);
    await expect(forEachAwait([1, 2, 3], (x) => x + 1)).resolves.toBe(4);
    await expect(forEachAwait(3, async (x) => x + 2)).resolves.toBe(4);
    await expect(
      forEachAwait(
        (x = 0) => (x > 2 ? undefined : x + 1),
        (x) => (x === 2 ? Promise.resolve(x) : x + 1)
      )
    ).resolves.toBe(4);

    await expect(mapAwait(asyncIt())).resolves.toEqual([1, 2, 3]);
    await expect(
      mapAwait(Promise.resolve(asyncIt()), async (item) =>
        Promise.resolve(item)
      )
    ).resolves.toEqual([1, 2, 3]);
    await expect(mapAwait([1, 2, 3])).resolves.toEqual([1, 2, 3]);
    await expect(mapAwait(asyncIt(), (x) => x + 1)).resolves.toEqual([2, 3, 4]);
    await expect(mapAwait(asyncIt(), async (x) => x + 1)).resolves.toEqual([
      2, 3, 4,
    ]);
    await expect(
      mapAwait(asyncIt(), (x) => (x === 2 ? Promise.resolve(x) : x + 1))
    ).resolves.toEqual([2, 2, 4]);
    await expect(mapAwait([1, 2, 3], (x) => x + 1)).resolves.toEqual([2, 3, 4]);
    await expect(mapAwait(3, async (x) => x + 2)).resolves.toEqual([2, 3, 4]);
    await expect(
      mapAwait(
        (x = 0) => (x > 2 ? undefined : x + 1),
        (x) => (x === 2 ? Promise.resolve(x) : x + 1)
      )
    ).resolves.toEqual([2, 2, 4]);

    await expect(forEachAwait(null)).resolves.toBe(null);
    await expect(forEachAwait(undefined)).resolves.toBe(undefined);
    await expect(forEachAwait(false)).resolves.toBe(undefined);
    await expect(forEachAwait(0)).resolves.toBe(undefined);
    await expect(forEachAwait("")).resolves.toBe(undefined);

    await expect(mapAwait(null)).resolves.toBe(null);
    await expect(mapAwait(undefined)).resolves.toBe(undefined);
    await expect(mapAwait(false)).resolves.toBe(undefined);
    await expect(mapAwait(0)).resolves.toEqual([]);
    await expect(mapAwait("")).resolves.toEqual([]);
  });

  it("Concatenates", () => {
    expect(concat(1)).toEqual([1]);
    expect(concat(null)).toEqual(undefined);
    expect(concat([null, null])).toEqual(undefined);
    expect(concat(null, undefined)).toEqual(undefined);
    expect(concat(1, null, undefined, 2, [3, 4])).toEqual([1, 2, 3, 4]);
    expect(concat(new Set([1, 2, [3], null, new Set([4, 5, 6])]))).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
  });
});
