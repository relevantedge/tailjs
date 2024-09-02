import {
  VariableFilter,
  VariableHeader,
  VariableKey,
  VariableStatus,
  VariableSetResult,
  VariableUsage,
} from "@tailjs/types";
import { InMemoryStorage, ParsingVariableStorage } from "../src";

describe("Variable stores store.", () => {
  it("InMemoryStore handles get/set", async () => {
    const store = new ParsingVariableStorage(new InMemoryStorage());

    const key = {
      key: "test",
      scope: "global",
    } as const;

    expect(
      (
        await store.set([
          {
            ...key,
            classification: "direct",
            value: "test",
          },
        ]).all
      )[0].status
    ).toBe(VariableStatus.Created);

    expect(await store.get([{ ...key }]).value).toBe("test");

    const sessionKeys = (["1", "2", "123"] as const).map(
      (targetId) =>
        ({
          ...key,
          scope: "session",
          targetId,
        } as const)
    );

    expect(
      (await store.get(sessionKeys).all).map((result) => result.status)
    ).toEqual([
      VariableStatus.NotFound,
      VariableStatus.NotFound,
      VariableStatus.NotFound,
    ]);

    const setSessions = await store.set(
      sessionKeys.map((key, i) => ({
        ...key,
        classification: "direct",
        value: `test${i}`,
      }))
    ).all;
    expect(
      setSessions.map((result) => [result.status, result.current?.value])
    ).toEqual([
      [VariableStatus.Created, "test0"],
      [VariableStatus.Created, "test1"],
      [VariableStatus.Created, "test2"],
    ]);

    expect(
      (
        await store.get([
          {
            scope: "session",
            key: "foobar",
            target: "foo",

            init: () => ({
              classification: "anonymous",
              purposes: "necessary",
              value: 10,
            }),
          },
        ])
      )[0]
    ).toMatchObject({ status: VariableStatus.Created, value: 10 });
  });

  it("InMemoryStore handles version conflicts", async () => {
    const key: VariableKey & VariableUsage = {
      scope: "user",
      entityId: "u",
      key: "test",
      classification: "direct",
      purposes: "any",
    };

    const store = new ParsingVariableStorage(new InMemoryStorage());

    let result = (
      await store.set([{ ...key, value: "version1" }])
    )[0] as any as VariableSetResult;

    expect(result?.status).toBe(VariableStatus.Created);

    expect(
      (result = (await store.set([{ ...key, value: "version1" }]).all)[0])
        ?.status
    ).toBe(VariableStatus.Conflict);

    let firstVersion = result.current?.version;
    expect([!!firstVersion, result.current?.value]).toEqual([true, "version1"]);
    expect(
      (result = await store.set([
        { ...key, value: "version2", version: result.current!.version },
      ]).result)?.status
    ).toBe(VariableStatus.Success);
    expect(result?.current?.version).toBeDefined();
    expect(result?.current?.version).not.toBe(firstVersion);

    expect(
      (result = await store.set([
        { ...key, patch: (current) => ({ value: current?.value + ".1" }) },
      ]).result)?.status
    ).toBe(VariableStatus.Success);

    expect(result?.current?.value).toBe("version2.1");

    expect(
      (result = await store.set([
        {
          ...key,
          patch: "ifMatch",
          match: undefined,
          value: "version3",
        },
      ])["result"])?.status
    ).toBe(VariableStatus.Unchanged);
    expect(result?.current?.value).toBe("version2.1");

    expect(
      (result = await store.set([
        {
          ...key,
          patch: "ifMatch",
          match: "version2.1",
          value: "version3",
        },
      ])["result"])?.status
    ).toBe(VariableStatus.Success);
    expect(result?.current?.value).toBe("version3");

    const currentVersion = result?.current?.version;
    expect(
      (await store.get([{ ...key, version: currentVersion }])["result"])?.status
    ).toBe(VariableStatus.Unchanged);
    expect(
      (await store.get([{ ...key, version: currentVersion + "not" }])["result"])
        ?.status
    ).toBe(VariableStatus.Success);
  });

  it("InMemoryStore handles queries", async () => {
    const target: VariableKey & VariableUsage = {
      scope: "session",
      entityId: "s",
      classification: "anonymous",
      purposes: "necessary",
      key: "",
    };
    const store = new ParsingVariableStorage(new InMemoryStorage());

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
