import { OmitUnion } from "../src";
import {
  appendQueryString,
  formatUri,
  ParsedUri,
  parseQueryString,
  parseUri,
  toQueryString,
} from "../src/parsers";

describe("parsers.ts", () => {
  const clean = <T>(value: T) =>
    Object.fromEntries(
      Object.entries(value as any).map(([key, value]) =>
        key === "query" && value ? [key, clean(value)] : [key, value]
      )
    );

  const _parseQueryString: typeof parseQueryString = (...args: any) =>
    clean((parseQueryString as any)(...args)) as any;

  it("Parses query strings", () => {
    expect(
      _parseQueryString("abc=32&test=1,2,3", { delimiters: false })
    ).toEqual({
      abc: "32",
      test: "1,2,3",
    });
    expect(_parseQueryString("abc=32&test=1,2,3")).toEqual({
      abc: "32",
      test: ["1", "2", "3"],
    });

    expect(_parseQueryString("test1&test2=1&test3=2&test4")).toEqual({
      test1: "",
      test2: "1",
      test3: "2",
      test4: "",
    });

    expect(_parseQueryString("test=foo&items[]=bar&items[]=baz+space")).toEqual(
      {
        test: "foo",
        items: ["bar", "baz space"],
      }
    );

    expect(
      _parseQueryString("test=foo&items[]=bar&items[]=baz+space", {
        delimiters: false,
      })
    ).toEqual({
      test: "foo",
      items: "bar,baz space",
    });

    expect(
      _parseQueryString("test=foo&items[]=bar&items[]=baz+space", {
        delimiters: false,
      })
    ).toEqual({
      test: "foo",
      items: "bar,baz space",
    });

    expect(_parseQueryString("t%C3%A6st=foo%C3%A6st,bar,baz")).toEqual({
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

  it("Parses URLs", () => {
    const testUri = (
      uri: string,
      expected: OmitUnion<ParsedUri, "source">,
      formatted = uri
    ) => {
      const parsed = clean(parseUri(uri));
      expect(parsed).toEqual({
        ...expected,
        source: uri,
        authority: formatUri({
          user: parsed.user,
          password: parsed.password,
          host: parsed.host,
          port: parsed.port,
        }),
      });

      expect(formatUri(parsed)).toEqual(formatted);
    };

    testUri("https://www.google.com", {
      scheme: "https",
      urn: false,
      path: "/",
      host: "www.google.com",
    });

    testUri("//www.google.com", {
      urn: false,
      path: "/",
      host: "www.google.com",
    });

    testUri("about:blank", {
      urn: true,
      scheme: "about",
      host: "blank",
      path: "",
    });

    testUri("https://www.google.com:80", {
      scheme: "https",
      urn: false,
      port: 80,
      host: "www.google.com",
      path: "/",
    });

    testUri("https://niels@www.google.com:80", {
      scheme: "https",
      urn: false,
      user: "niels",
      port: 80,
      host: "www.google.com",
      path: "/",
    });

    testUri("https://niels:foo@www.google.com:80", {
      scheme: "https",
      urn: false,
      user: "niels",
      password: "foo",
      port: 80,
      host: "www.google.com",
      path: "/",
    });

    testUri("https://niels:foo@localhost", {
      scheme: "https",
      urn: false,
      user: "niels",
      password: "foo",
      host: "localhost",
      path: "/",
    });

    testUri("www.test.dk/abc", {
      host: "www.test.dk",
      path: "/abc",
    });

    testUri("localhost?a=32&items=foo,bar", {
      host: "localhost",
      path: "/",
      query: { a: "32", items: ["foo", "bar"] },
    });

    testUri("https://127.0.0.1:8080/path/page.html?foo=bar#baz", {
      scheme: "https",
      urn: false,
      host: "127.0.0.1",
      port: 8080,
      path: "/path/page.html",
      query: { foo: "bar" },
      fragment: "baz",
    });
  });
});
