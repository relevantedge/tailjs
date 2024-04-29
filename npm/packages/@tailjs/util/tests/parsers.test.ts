import {
  appendQueryString,
  parseQueryString,
  toQueryString,
} from "../src/parsers";

describe("parsers.ts", () => {
  it("Parses query strings", () => {
    // expect(parseQueryString("abc=32&test=1,2,3", null)).toEqual({
    //   abc: "32",
    //   test: "1,2,3",
    // });
    expect(parseQueryString("abc=32&test=1,2,3")).toEqual({
      abc: "32",
      test: ["1", "2", "3"],
    });

    expect(parseQueryString("test=foo&items[]=bar&items[]=baz+space")).toEqual({
      test: "foo",
      items: ["bar", "baz space"],
    });

    expect(
      parseQueryString("test=foo&items[]=bar&items[]=baz+space", null)
    ).toEqual({
      test: "foo",
      items: "bar,baz space",
    });

    expect(
      parseQueryString("test=foo&items[]=bar&items[]=baz+space", null)
    ).toEqual({
      test: "foo",
      items: "bar,baz space",
    });

    expect(parseQueryString("t%C3%A6st=foo%C3%A6st,bar,baz")).toEqual({
      ["tæst"]: ["fooæst", "bar", "baz"],
    });
  });

  it("Formats query strings", () => {
    expect(toQueryString({ foo: "æøå" })).toBe("foo=%C3%A6%C3%B8%C3%A5");
    expect(
      toQueryString({
        foo: "abc",
        bar: ["1", "2", null, "item3", false, undefined, "itæm4"],
      })
    ).toBe("foo=abc&bar=1,2,item3,false,it%C3%A6m4");

    expect(appendQueryString("www.test.com", { foo: 32 })).toBe(
      "www.test.com?foo=32"
    );

    expect(appendQueryString("www.test.com?current=abc", { foo: 32 })).toBe(
      "www.test.com?foo=32"
    );
  });
});
