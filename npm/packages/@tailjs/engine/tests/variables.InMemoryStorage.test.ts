import {
  DataClassification,
  DataPurposes,
  VariableFilter,
  VariableHeader,
  VariableKey,
  VariableSetStatus,
  dataClassification,
  dataPurpose,
  dataPurposes,
  setStatus,
  validateConsent,
} from "@tailjs/types";
import {
  add,
  expand,
  flatMap,
  forEach,
  isArray,
  isDefined,
  isObject,
  isUndefined,
  required,
} from "@tailjs/util";
import Ajv from "ajv";
import { InMemoryStorage, SchemaManager, VariableStorage } from "../src";

describe("Variable stores store.", () => {
  it.only("Schema tests should not go here. Yet, they did.", () => {
    const schema = {
      //$schema: "https://json-schema.org/draft/2020-12",
      $id: "urn:tailjs:core",
      "x-privacy-class": "anonymous",
      "x-privacy-purposes": "necessary",
      $defs: {
        type1: {
          type: "object",

          properties: {
            type: { type: "string" },
            testNumber: {
              "x-privacy-class": "anonymous",
              type: "number",
            },
            testReference: {
              "x-privacy-class": "indirect",
              $ref: "urn:acme:other#/$defs/type2",
            },
            foo: {
              type: "array",
              items: {
                $ref: "#/$defs/type3",
              },
            },
          },
          additionalProperties: false,
        },
        type3: {
          type: "object",
          "x-privacy-class": "sensitive",

          properties: {
            test: {
              type: "string",
              format: "date-time",
            },
            lax: {
              "x-privacy-class": "anonymous",
              type: "string",
            },
          },
        },

        "urn:acme:other": {
          $id: "urn:acme:other",
          "x-privacy-purposes": "functionality",

          $defs: {
            type2: {
              "x-privacy-class": "indirect",
              type: "object",
              properties: {
                nestedNumber: {
                  "x-privacy-class": "anonymous",
                  type: "number",
                },
                nestedReference: {
                  "x-privacy-class": "direct",
                  $ref: "urn:tailjs:core#/$defs/type1",
                },
              },
              additionalProperties: false,
            },
          },
        },
      },
    };

    type TestType1 = {
      testNumber?: number;
      testReference?: TestType2;
    };

    type TestType2 = {
      nestedNumber?: number;
      nestedReference?: TestType1;
    };

    const manager = new SchemaManager([schema]);

    type NoAdditional<T, Base> = Base extends T
      ? T
      : {
          [P in keyof T]: P extends keyof Base
            ? NoAdditional<T[P], Base[P]>
            : never;
        };

    const validate = <T extends TestType1>(
      data: T & NoAdditional<T, TestType1>
    ): T extends NoAdditional<T, TestType1> ? T : never => data as any;

    const data = validate({
      testNumber: 20,
      testReference: {
        nestedNumber: 11,
        nestedReference: {
          testNumber: 20,
        },
      },
      foo: [{ test: "2023-01-01T00:00:00Z", lax: "gazonk" }] as any,
    } as any);

    expect(manager.validate("urn:tailjs:core#type1", data)).toBe(data);

    expect(
      manager.censor("urn:tailjs:core#type1", data, {
        classification: DataClassification.Sensitive,
        purposes: DataPurposes.Any,
      })
    ).toEqual(data);

    expect(
      manager.censor("urn:tailjs:core#type1", data, {
        classification: DataClassification.Anonymous,
        purposes: DataPurposes.Any,
      })
    ).toEqual({
      testNumber: data.testNumber,
      foo: [{ lax: "gazonk" }],
    } as Partial<typeof data>);
  });

  it("InMemoryStore handles get/set.", async () => {
    const store = new InMemoryStorage() as VariableStorage;

    const key: VariableKey = {
      key: "test",
      scope: "global",
    };

    expect(
      (
        await store.set([
          {
            ...key,
            classification: "direct",
            value: "test",
          },
        ])
      )[0].status
    ).toBe(VariableSetStatus.Success);

    expect((await store.get([{ ...key }]))[0]?.value).toBe("test");

    const sessionKeys = ["1", "2", "123"].map(
      (targetId) =>
        ({
          ...key,
          scope: "session",
          targetId,
        } as VariableKey)
    );

    expect(await store.get(sessionKeys)).toEqual([
      undefined,
      undefined,
      undefined,
    ]);

    const setSessions = await store.set(
      sessionKeys.map((key, i) => ({
        ...key,
        classification: "direct",
        value: `test${i}`,
      }))
    );
    expect(
      setSessions.map((result) => [result.status, result.current?.value])
    ).toEqual([
      [setStatus.success, "test0"],
      [setStatus.success, "test1"],
      [setStatus.success, "test2"],
    ]);
  });

  it("InMemoryStore handles version conflicts.", async () => {
    const key: VariableHeader<false> = {
      scope: "user",
      targetId: "u",
      key: "test",
      classification: "direct",
    };

    const store = new InMemoryStorage() as VariableStorage;
    let result = (await store.set([{ ...key, value: "version1" }]))[0];
    expect(result?.status).toBe(VariableSetStatus.Success);

    expect(
      (result = (await store.set([{ ...key, value: "version1" }]))[0])?.status
    ).toBe(VariableSetStatus.Conflict);

    let firstVersion = result.current?.version;
    expect([!!firstVersion, result.current?.value]).toEqual([true, "version1"]);
    expect(
      (result = (
        await store.set([
          { ...key, value: "version2", version: result.current!.version },
        ])
      )[0])?.status
    ).toBe(VariableSetStatus.Success);
    expect(result.current?.version).toBeDefined();
    expect(result.current?.version).not.toBe(firstVersion);

    expect(
      (result = (
        await store.set([
          { ...key, patch: (current) => ({ value: current?.value + ".1" }) },
        ])
      )[0])?.status
    ).toBe(VariableSetStatus.Success);

    expect(result.current?.value).toBe("version2.1");

    expect(
      (result = (
        await store.set([
          {
            ...key,
            patch: { type: "ifMatch", match: undefined, value: "version3" },
          },
        ])
      )[0])?.status
    ).toBe(VariableSetStatus.Unchanged);
    expect(result.current?.value).toBe("version2.1");

    expect(
      (result = (
        await store.set([
          {
            ...key,
            patch: { type: "ifMatch", match: "version2.1", value: "version3" },
          },
        ])
      )[0])?.status
    ).toBe(VariableSetStatus.Success);
    expect(result.current?.value).toBe("version3");

    const currentVersion = result.current?.version;
    expect(
      (await store.get([{ ...key, version: currentVersion }]))[0].unchanged
    ).toBe(true);
    expect(
      (await store.get([{ ...key, version: currentVersion + "not" }]))[0]
        .unchanged
    ).not.toBe(true);
  });

  it("InMemoryStore handles queries.", async () => {
    const target: VariableHeader<false> = {
      scope: "session",
      targetId: "s",
      classification: "anonymous",
      key: "",
    };
    const store = new InMemoryStorage() as VariableStorage;
    await store.set([
      { ...target, key: "key1", value: "value1" },
      {
        ...target,
        key: "key2",
        value: "value2",
        purposes: ["infrastructure"],
        tags: ["tag1"],
      },
      {
        ...target,
        key: "key3",
        value: "value3",
        classification: "direct",
        tags: ["tag1", "tag2"],
      },
    ]);

    let results = await store.query([{ keys: ["key1"] }]);
    expect(results.count).toBeUndefined();
    expect(results.results[0].value).toBe("value1");
    results = await store.query([{ keys: ["key1"] }], { count: true });
    expect(results.count).toBe(1);

    results = await store.query([{ keys: ["*"] }], { count: true });
    expect(results.results.map((result) => [result.key, result.value])).toEqual(
      [
        ["key1", "value1"],
        ["key2", "value2"],
        ["key3", "value3"],
      ]
    );
    expect(results.count).toBe(3);

    const query = async (filters: VariableFilter[]) =>
      (await store.query(filters)).results.map((result) => result.key);

    expect(
      await query([{ keys: ["*"], classification: { max: "anonymous" } }])
    ).toEqual(["key1", "key2"]);

    expect(
      await query([{ keys: ["*"], classification: { min: "indirect" } }])
    ).toEqual(["key3"]);

    expect(
      await query([{ keys: ["*"], classification: { min: "direct" } }])
    ).toEqual(["key3"]);

    expect(
      await query([
        {
          keys: ["*"],
          classification: { levels: ["anonymous", "indirect"] },
        },
      ])
    ).toEqual(["key1", "key2"]);

    expect(
      await query([
        {
          keys: ["*"],
          purposes: "infrastructure",
        },
      ])
    ).toEqual(["key2"]);

    expect(
      await query([
        {
          keys: ["*"],
          tags: [["tag1"]],
        },
      ])
    ).toEqual(["key2", "key3"]);

    expect(
      await query([
        {
          keys: ["*"],
          tags: [["tag1", "tag2"]],
        },
      ])
    ).toEqual(["key3"]);

    expect(
      await query([
        {
          keys: ["*"],
          tags: [["tag1"], ["tag1", "tag2"], ["tag3"]],
        },
      ])
    ).toEqual(["key2", "key3"]);

    expect(
      await query([
        {
          keys: ["*"],
          tags: [["tag3"]],
        },
      ])
    ).toEqual([]);

    expect(
      await query([
        {
          keys: ["*"],
          tags: [["tag2"]],
        },
        {
          keys: ["*"],
          purposes: "infrastructure",
        },
      ])
    ).toEqual(["key3", "key2"]);

    expect(
      await query([
        {
          keys: ["*"],
          tags: [["tag1"]],
          purposes: "infrastructure",
        },
      ])
    ).toEqual(["key2"]);

    await store.purge([{ keys: ["*"], classification: { min: "indirect" } }]);

    expect(await query([{ keys: ["*"] }])).toEqual(["key1", "key2"]);
  });
});
