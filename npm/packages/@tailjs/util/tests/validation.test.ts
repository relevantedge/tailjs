import { structuresEqual } from "../src";

describe("validation.ts", () => {
  it("Deep compares objects", () => {
    const x = { a: 32, b: 80 };

    expect(structuresEqual(x, x)).toBe(true);

    expect(structuresEqual(0, 0)).toBe(true);
    expect(structuresEqual(x, { a: 32, b: 80 })).toBe(true);
    expect(structuresEqual(x, { a: 32, b: 81 })).toBe(false);

    expect(structuresEqual(x, { a: null, b: 80 })).toBe(false);
    expect(structuresEqual(x, { a: 32 })).toBe(false);
    expect(structuresEqual({ a: 32 }, x)).toBe(false);

    expect(
      structuresEqual(
        { a: 10, b: { c: [1, 2, 3] } },
        { a: 10, b: { c: [1, 2, 3] } }
      )
    ).toBe(true);

    expect(
      structuresEqual(
        { b: { c: [1, 2, 3] }, a: 10 },
        { a: 10, b: { c: [1, 2, 3] } }
      )
    ).toBe(true);

    expect(
      structuresEqual(
        { a: 10, b: { c: [1, , 3] } },
        { a: 10, b: { c: [1, 2, 3] } }
      )
    ).toBe(false);

    expect(
      structuresEqual(
        { a: 10, b: { c: [1, 3, 2] } },
        { a: 10, b: { c: [1, 2, 3] } }
      )
    ).toBe(false);
  });
});
