import { structuralEquals } from "../src";

describe("validation.ts", () => {
  it("Deep compares objects", () => {
    const x = { a: 32, b: 80 };

    expect(structuralEquals(x, x)).toBe(true);

    expect(structuralEquals(0, 0)).toBe(true);
    expect(structuralEquals(x, { a: 32, b: 80 })).toBe(true);
    expect(structuralEquals(x, { a: 32, b: 81 })).toBe(false);

    expect(structuralEquals(x, { a: null, b: 80 })).toBe(false);
    expect(structuralEquals(x, { a: 32 })).toBe(false);
    expect(structuralEquals({ a: 32 }, x)).toBe(false);

    expect(
      structuralEquals(
        { a: 10, b: { c: [1, 2, 3] } },
        { a: 10, b: { c: [1, 2, 3] } }
      )
    ).toBe(true);

    expect(
      structuralEquals(
        { b: { c: [1, 2, 3] }, a: 10 },
        { a: 10, b: { c: [1, 2, 3] } }
      )
    ).toBe(true);

    expect(
      structuralEquals(
        { a: 10, b: { c: [1, , 3] } },
        { a: 10, b: { c: [1, 2, 3] } }
      )
    ).toBe(false);

    expect(
      structuralEquals(
        { a: 10, b: { c: [1, 3, 2] } },
        { a: 10, b: { c: [1, 2, 3] } }
      )
    ).toBe(false);
  });
});
