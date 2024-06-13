import { parseTags } from "../src";

describe("parseTagString.ts", () => {
  it("Parses tags", () => {
    expect(parseTags("test1=value")[0]).toEqual({
      tag: "test1",
      value: "value",
    });
    expect(parseTags("test1: value")[0]).toEqual({
      tag: "test1",
      value: "value",
    });
    expect(parseTags("test1: 'value'")[0]).toEqual({
      tag: "test1",
      value: "value",
    });
    expect(parseTags('test1: "value" tag2:test')[0]).toEqual({
      tag: "test1",
      value: "value",
    });
    expect(parseTags("test1: spaced value, tag2:test")[0]).toEqual({
      tag: "test1",
      value: "spaced value",
    });

    expect(parseTags('test1: "quotes "in it"')[0]).toEqual({
      tag: "test1",
      value: 'quotes "in it',
    });

    expect(
      parseTags("ns::test1: value 1~1 #test2=value 2~5 #test3:w00t~10")
    ).toEqual([
      {
        tag: "ns::test1",
        value: "value 1",
        score: 0.1,
      },
      {
        tag: "test2",
        value: "value 2",
        score: 0.5,
      },
      {
        tag: "test3",
        value: "w00t",
      },
    ]);

    expect(
      parseTags(["tag1: 1, tag2=2", null, { tag: "tag3", value: "3" }])
    ).toEqual([
      { tag: "tag1", value: "1" },
      { tag: "tag2", value: "2" },
      { tag: "tag3", value: "3" },
    ]);

    expect(
      parseTags(
        "tag:value1~5, tag:value1~9, tag:value2, tag:value1~2, tag:value2~1"
      )
    ).toEqual([
      { tag: "tag", value: "value1", score: 0.9 },
      { tag: "tag", value: "value2" },
    ]);
  });
});
