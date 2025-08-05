import { mapTags, uniqueTags } from "../src";

describe("parseTagString.ts", () => {
  it("Parses tags", () => {
    expect(mapTags("test1=value")?.[0]).toEqual({
      tag: "test1",
      value: "value",
    });
    expect(mapTags("test1: value")).toEqual([
      {
        tag: "test1",
      },
      {
        tag: "value",
      },
    ]);
    expect(mapTags("   test1 =    'value'   ")?.[0]).toEqual({
      tag: "test1",
      value: "value",
    });
    expect(mapTags('test1="value" tag2:test~. tag2:test~.4')).toEqual([
      {
        tag: "test1",
        value: "value",
      },
      { tag: "tag2:test", score: 0.4 },
    ]);
    expect(mapTags("test1= spaced value   , tag2:test")?.[0]).toEqual({
      tag: "test1",
      value: "spaced value",
    });

    expect(mapTags('test1="quotes \\"in it"')?.[0]).toEqual({
      tag: "test1",
      value: 'quotes "in it',
    });

    expect(
      mapTags("ns::test1=value 1~0 #test2='value 2~5'~5 #test3:w00t~1")
    ).toEqual([
      {
        tag: "ns::test1",
        value: "value 1",
        score: 0,
      },
      {
        tag: "test2",
        value: "value 2~5",
        score: 5,
      },
      {
        tag: "test3:w00t",
        score: 1,
      },
    ]);

    expect(
      mapTags([
        { tag: "tag1", value: "ok" },
        "tag1, tag2=2",
        null,
        { tag: "tag3", value: "3" },
      ])
    ).toEqual([
      { tag: "tag1", value: "ok" },
      { tag: "tag1" },
      { tag: "tag2", value: "2" },
      { tag: "tag3", value: "3" },
    ]);

    expect(
      mapTags(
        "tag:value1~5, tag:value1~9, tag:value2, tag:value1~2, tag:value2~1"
      )
    ).toEqual([
      { tag: "tag:value1", score: 2 },
      { tag: "tag:value2", score: 1 },
    ]);

    const tagCollection = mapTags([
      {
        tag1: true,
        tag2: { eventType: "form", value: "form-specific" },
      },
      "tag2=default",
      { tag2: { eventType: "type2", value: "default", score: 0.5 } },
    ]);
    expect(uniqueTags(tagCollection)).toEqual([
      { tag: "tag1" },
      { tag: "tag2", value: "default" },
    ]);
    expect(uniqueTags(tagCollection, "unknown")).toEqual([
      { tag: "tag1" },
      { tag: "tag2", value: "default" },
    ]);

    expect(uniqueTags(tagCollection, "form")).toEqual([
      { tag: "tag1" },
      { tag: "tag2", value: "form-specific" },
      { tag: "tag2", value: "default" },
    ]);
    expect(uniqueTags(tagCollection, "type2")).toEqual([
      { tag: "tag1" },
      { tag: "tag2", value: "default", score: 0.5 },
    ]);

    expect(
      mapTags({
        tag1: "ok",
        falsish: "",
        falsish2: false,
        falsishZero: 0,
        zero: "0",
        tag2: {
          nested: { value: "21", score: 0.9 },
          nested2: { level3: true, level4: false },
          "namespace::": {
            yes: true,
            ok: {
              x: "30",
            },
          },
        },
      })
    ).toEqual([
      { tag: "tag1", value: "ok" },
      { tag: "zero", value: "0" },
      { tag: "tag2:nested", value: "21", score: 0.9 },
      { tag: "tag2:nested2:level3" },
      { tag: "namespace::tag2:yes" },
      { tag: "namespace::tag2:ok:x", value: "30" },
    ]);

    expect(
      mapTags(["::test1", { test2: true }, { tag: "test3:test31" }], {
        prefix: "abc:",
        ns: "testns",
      })
    ).toEqual([
      { tag: "testns::abc:test1" },
      { tag: "testns::abc:test2" },
      { tag: "testns::abc:test3:test31" },
    ]);
  });
});
