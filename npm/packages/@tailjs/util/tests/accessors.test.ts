import { get, set, update } from "../src";

const createTestTargets = () =>
  [
    { a: 10, b: 20 },
    [10, 20],
    new Map<string, number>([
      ["a", 10],
      ["b", 20],
    ]),
    new Set<string>(["a", "b"]),
  ] as const;

describe("Accessors accesses what they access", () => {
  it("Gets", () => {
    const [o, a, m, s] = createTestTargets();

    expect(get(o, "a")).toBe(10);
    expect(get(o, "g")).toBe(undefined);
    expect(get(m, "a")).toBe(10);
    expect(get(m, "g")).toBe(undefined);
    expect(get(s, "a")).toBe(true);
    expect(get(s, "g")).toBe(false);
    expect(get(a, 0)).toBe(10);
    expect(get(a, 10)).toBe(undefined);
  });

  it("Sets and updates.", () => {
    let [o, a, m, s] = createTestTargets();

    expect(set(o, "b", 30)).toEqual(true);
    expect(set(o, [[["c", "test"]]])).toEqual({ a: 10, b: 30, c: "test" });

    expect(update(o, "a", (current) => current + 5)).toEqual(true);
    expect(update(o, [{ a: (current) => current + 3 }])).toEqual({
      a: 18,
      b: 30,
      c: "test",
    });

    expect(update(o, { a: (current) => current + 3 })).toEqual({
      a: 21,
      b: 30,
      c: "test",
    });

    expect(set(m, "c", 80)).toBe(true);
    expect(m.get("c")).toBe(80);

    expect(set(s, "c", true)).toBe(true);
    expect(get(s, "c")).toBe(true);
    expect(s.has("c")).toBe(true);
    set(s, "c", false);
    expect(s.has("c")).toBe(false);
  });
});
