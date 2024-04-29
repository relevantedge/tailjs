import { createEnumAccessor } from "../src";

describe("enums.ts", () => {
  it("applies to non-flag enums.", () => {
    const helper = createEnumAccessor(
      { value1: 10, value2: 20 } as const,
      false,
      "non-flag test"
    );

    expect(helper.parse("value1")).toBe(10);
    expect(helper.parse(10)).toBe(10);
    expect(helper.parse(undefined)).toBeUndefined();
    expect(helper.lookup("value1")).toBe("value1");
    expect(helper.lookup(10)).toBe("value1");
    expect(helper.lookup(undefined)).toBeUndefined();

    expect(() => helper.parse("fanda")).toThrow('fanda" is not a valid');
    expect(helper.tryParse("fanda")).toBeUndefined();

    expect(helper.logFormat("value1")).toBe("the non-flag test 'value1'");
  });

  it("applies to flag enums.", () => {
    const helper = createEnumAccessor(
      { value1: 2, value2: 4, value3: 8 } as const,
      true,
      "flag test"
    );

    expect(helper("any")).toBe(2 | 4 | 8);

    expect(helper.parse("value1")).toBe(2);
    expect(helper.length).toBe(3);
    expect(helper.parse(["value1", "value1"])).toBe(2);
    expect(helper.parse(["value1", "value2"])).toBe(2 | 4);
    expect(helper.lookup("value1")).toEqual(["value1"]);
    expect(helper.lookup(2 | 4)).toEqual(["value1", "value2"]);

    expect(helper.lookup([2, "value2"])).toEqual(["value1", "value2"]);

    expect(helper.lookup(0)).toEqual([]);
    expect(helper.format(0)).toEqual("none");
    expect(helper.format(2)).toEqual("value1");
    expect(helper.lookup(2)).toEqual(["value1"]);
    expect(helper.format(4)).toEqual("value2");
    expect(helper.lookup(4)).toEqual(["value2"]);
    expect(helper.format(["value1", "value2", "value3"])).toEqual("any");
    expect(helper.lookup(["value1", "value2", "value3"])).toEqual([
      "value1",
      "value2",
      "value3",
    ]);
    expect(helper.format(14)).toEqual("any");
    expect(helper.lookup(14)).toEqual(["value1", "value2", "value3"]);
    expect(helper.format(15)).toEqual("any");
    expect(helper.lookup(7)).toEqual(["value1", "value2"]);

    expect(helper.map(2)).toEqual([2]);
    expect(helper.map(6, ([name, flag], i) => `${i}:${name}=${flag}`)).toEqual([
      "0:value1=2",
      "1:value2=4",
    ]);

    expect(() => helper.parse("fanda")).toThrow('fanda" is not a valid');
    expect(helper.tryParse("fanda")).toBeUndefined();
  });

  it("Special flags are handled.", () => {
    const helper = createEnumAccessor(
      { value1: 2, value2: 4, value3: 8, mix: 12 } as const,
      true,
      "flag test"
    );
    const helper2 = createEnumAccessor(
      { value1: 2, value2: 4, value3: 8, mix: 12 } as const,
      true,
      "flag test",
      14
    );

    const helper3 = createEnumAccessor(
      {
        value1: 2,
        value2: 4,
        value3: 8,
        mix: 12,
        any: 14,
        special: 16,
      } as const,
      true,
      "flag test",
      14
    );

    expect(helper.lookup(14)).toEqual(["value1", "value2", "value3"]);

    expect(helper2.lookup(14)).toEqual(["value1", "value2", "value3"]);
    expect(helper2.format(12)).toEqual("mix");
    expect(helper2.lookup("any")).toEqual(["value1", "value2", "value3"]);
    expect(helper3.lookup("any")).toEqual(["value1", "value2", "value3"]);
    expect(helper3.lookup(14 + 16)).toEqual([
      "value1",
      "value2",
      "value3",
      "special",
    ]);
    expect(helper3.format(14 + 16)).toEqual(["any", "special"]);
    expect(helper3.format(12 + 16)).toEqual(["mix", "special"]);
  });
});
