import {
  get,
  remove,
  assign,
  update,
  add,
  map,
  clone,
  ConstToTuples,
} from "../src";

const tuple = <R extends any[]>(...values: R): R => values;
const createTestTargets = () =>
  tuple(
    { a: 10, b: 20 },
    [10, 20],
    new Map<string, number>([
      ["a", 10],
      ["b", 20],
    ]),
    new Set<string>(["a", "b"])
  );

describe("Accessors accesses what they access", () => {
  it("Gets", () => {
    const [o, a, m, s] = createTestTargets();

    expect(get(o, "a")).toBe(10);
    expect(get(o as any, "g")).toBe(undefined);
    expect(get(m, "a")).toBe(10);
    expect(get(m, "g")).toBe(undefined);
    expect(get(s, "a")).toBe(true);
    expect(get(s, "g")).toBe(false);
    expect(get(a, 0)).toBe(10);
    expect(get(a, 10)).toBe(undefined);
  });

  it("Sets and updates.", () => {
    let [o, a, m, s] = createTestTargets();

    expect(assign(o, "b", 30)).toEqual(30);
    expect(assign(o as any, [["c", "test"]])).toEqual({
      a: 10,
      b: 30,
      c: "test",
    });

    expect(update(o, "a", (current) => current + 5)).toEqual(15);
    expect(update(o, { a: (current) => current + 3 })).toEqual({
      a: 18,
      b: 30,
      c: "test",
    });

    expect(update(o, { a: (current) => current + 3 })).toEqual({
      a: 21,
      b: 30,
      c: "test",
    });

    expect(assign(m, "c", 80)).toBe(80);
    expect(m.get("c")).toBe(80);

    expect(assign(s, "c", true)).toBe(true);
    expect(get(s, "c")).toBe(true);
    expect(s.has("c")).toBe(true);
    assign(s, "c", false);
    expect(s.has("c")).toBe(false);

    remove(o, "a");
    expect(o.a).toBe(undefined);

    const obj = assign(
      {},
      map(2, (i) => ["T" + i, i] as const)
    );
    expect(obj["T1"]).toBe(1);

    expect(add(s, "test")).toBe(true);
    expect(add(s, "test")).toBe(false);
    expect(remove(s, "test")).toBe(true);
    expect(remove(s, "test")).toBe(false);

    expect(get(o as any, "gazonk", () => 80)).toBe(80);
    expect(get(o as any, "gazonk")).toBe(80);
    get(o as any, "gazonk", () => 37);
    expect(get(o as any, "gazonk")).toBe(80);

    expect(get(o as any, "test37", 37)).toBe(37);
    assign(o as any, "test37", 38);
    expect(get(o as any, "test37", 37)).toBe(38);
  });
  it("clones", () => {
    let [o, a, m, s] = createTestTargets();

    expect(clone(o)).toEqual(o);
    expect(clone(o)).not.toBe(o);

    expect(clone(a)).toEqual(a);
    expect(clone(a)).not.toBe(a);

    expect(clone(s)).toEqual(s);
    expect(clone(s)).not.toBe(s);

    expect(clone(m)).toEqual(m);
    expect(clone(m)).not.toBe(false);

    const deep = {
      a: [1, 2, new Set([1, 2, 3])],
      b: {
        c: new Map([[1, [2, 3, 4]]]),
      },
    };
    let cloned = clone(deep, true);
    expect(cloned).toEqual(deep);
    expect(cloned.b.c).not.toBe(deep.b.c);
    expect(cloned.b.c.get(1)).not.toBe(deep.b.c.get(1));

    cloned = clone(deep, false);
    expect(cloned).not.toBe(deep);
    expect(cloned.b.c.get(1)).toBe(deep.b.c.get(1));
  });
});
