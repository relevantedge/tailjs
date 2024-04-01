import { createEnumAccessor } from "../src";

describe("Enum utilities works as they should.", () => {
  it("applies to non-flag enums.", () => {
    const helper = createEnumAccessor(
      { value1: 10, value2: 20 } as const,
      false,
      "non-flag test"
    );

    expect(helper.value1).toBe(10);
    expect(helper.parse("value1")).toBe(10);
    expect(helper.parse(10)).toBe(10);
    expect(helper.parse(undefined)).toBeUndefined();
    expect(helper.lookup("value1")).toBe("value1");
    expect(helper.lookup(10)).toBe("value1");
    expect(helper.lookup(undefined)).toBeUndefined();

    expect(() => helper.parse("fanda")).toThrow('fanda" is not a valid');
    expect(helper.tryParse("fanda")).toBeUndefined();
  });

  it("applies to flag enums.", () => {
    const helper = createEnumAccessor(
      { value1: 2, value2: 4 } as const,
      true,
      "flag test"
    );

    expect(helper.any).toBe(2 | 4);

    expect(helper.parse("value1")).toBe(2);
    expect(helper.parse(["value1", "value1"])).toBe(2);
    expect(helper.parse(["value1", "value2"])).toBe(2 | 4);
    expect(helper.lookup("value1")).toEqual(["value1"]);
    expect(helper.lookup(2 | 4)).toEqual(["value1", "value2"]);

    expect(helper.lookup([2, "value2"])).toEqual(["value1", "value2"]);

    expect(helper.lookup(0)).toEqual([]);

    expect(helper.map(2)).toEqual([2]);
    expect(helper.map(6, ([name, flag], i) => `${i}:${name}=${flag}`)).toEqual([
      "0:value1=2",
      "1:value2=4",
    ]);

    expect(() => helper.parse("fanda")).toThrow('fanda" is not a valid');
    expect(helper.tryParse("fanda")).toBeUndefined();
  });
});
