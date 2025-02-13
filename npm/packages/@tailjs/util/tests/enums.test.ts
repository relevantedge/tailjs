import { createEnumParser } from "../src";

describe("enums.ts", () => {
  const values = {
    /** Documentation. */
    a: "a",
    b: "b",
    c: "c",
  } as const;

  const parser = createEnumParser("value", values);

  it("Parses", () => {
    expect(parser.parse("a")).toBe("a");
    expect(() => parser.parse("nope")).toThrow(
      'The value "nope" is not defined.'
    );
    expect(parser.parse("nope", false)).toBeUndefined();

    expect(parser.a).toBe("a"); // We should also see the TSDoc for `a` is preserved in vscode.

    expect(parser.compare("c", "a")).toBe(1);
    expect(parser.compare("a", "b")).toBe(-1);
    expect(parser.compare("b", "b")).toBe(0);

    const parser2 = createEnumParser("derived", {
      ...parser,
      g: "g", // To test that keys don't change order.
      d: "d",
      e: 10,
    } as const);

    expect(parser2.a).toBe("a");
    expect(parser2.d).toBe("d");
    expect(parser2.compare("d", "g")).toBe(1);
    expect(parser2.compare("a", "g")).toBe(-1);
    expect(parser2["e"]).toBeUndefined();

    // The parse and compare functions must not be enumerated.
    expect(Object.keys(parser2)).toEqual(["a", "b", "c", "g", "d"]);
  });
});
