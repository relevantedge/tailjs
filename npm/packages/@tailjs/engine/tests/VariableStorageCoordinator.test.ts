import {
  ResultStatusValue,
  VariableKey,
  VariableStatus,
  VariableScope,
  VariableSetter,
  resultStatus,
  stripPrefix,
  toNumericVariableEnums,
} from "@tailjs/types";
import {
  InMemoryStorage,
  ParsingVariableStorage,
  VariableStorageCoordinator,
} from "../src";
import { prefixedVariableSchema, variablesSchema } from "./test-schemas";
import { EntityMetadata, SchemaManager } from "@tailjs/json-schema";

const stripMetadata = <T>(value: T): T => (
  value && delete value[EntityMetadata.TypeId], value
);

describe("VariableStorageCoordinator", () => {
  const disablePatching = (storage: InMemoryStorage) => (
    (storage._testDisablePatch = true), storage
  );

  const setupStorage = () => {
    const schemaManager = SchemaManager.create([
      variablesSchema,
      prefixedVariableSchema,
    ]);

    const defaultStorage = new InMemoryStorage();
    const sessionStorage = new ParsingVariableStorage(
      disablePatching(new InMemoryStorage())
    );

    const prefixSessionStorage1 = new ParsingVariableStorage(
      new InMemoryStorage()
    );
    const prefixSessionStorage2 = new ParsingVariableStorage(
      new InMemoryStorage()
    );

    const coordinator = new ParsingVariableStorage(
      new VariableStorageCoordinator({
        mappings: {
          default: { storage: defaultStorage, schema: "urn:variables:default" },
          session: {
            "": {
              storage: sessionStorage.toStorage(),
              schema: "urn:variables:default",
            },
            test: {
              storage: prefixSessionStorage1.toStorage(),
              schema: ["urn:variables:prefixed"],
            },
            all: { storage: prefixSessionStorage2.toStorage(), schema: "*" },
          },
        },
        schema: schemaManager,
      })
    );

    return {
      coordinator,
      defaultStorage,
      sessionStorage,
      prefixSessionStorage1,
      prefixSessionStorage2,
    } as const;
  };
  it("Splits", async () => {
    const {
      coordinator,
      sessionStorage,
      defaultStorage,
      prefixSessionStorage1,
    } = setupStorage();
    const key: VariableKey = { scope: "session", key: "test", entityId: "foo" };
    const prefixedKey = { ...key, key: "test:prefixed" };
    expect(await coordinator.get([key]).value).toBeUndefined();

    expect(
      (await coordinator.set([{ ...key, value: "32" }]).result).status
    ).toBe(VariableStatus.Created);

    expect(
      (await coordinator.set([{ ...key, value: "33" }]).all)[0].status
    ).toBe(VariableStatus.Conflict);

    expect(await coordinator.get([key]).value).toBe("32");
    expect(await sessionStorage.get([key]).value).toBe("32");
    expect(
      (await defaultStorage.get([toNumericVariableEnums(key)]))[0].value
    ).toBeUndefined();

    // Also handles conflicts in the background.
    expect(
      (
        await coordinator.set([
          {
            ...key,
            patch: "ifNoneMatch",
            match: undefined,
            value: "34",
          },
        ])
      )[0].status
    ).toBe(VariableStatus.Success);

    expect((await coordinator.get([key]))[0].value).toBe("34");
    expect((await sessionStorage.get([key]))[0].value).toBe("34");

    expect(
      (await coordinator.set([{ ...prefixedKey, value: "abc" }]))[0].status
    ).toBe(VariableStatus.Created);
    expect((await coordinator.get([key]))[0].value).toBe("34");
    expect((await coordinator.get([prefixedKey]))[0].value).toBe("abc");

    expect((await sessionStorage.get([prefixedKey]))[0].value).toBeUndefined();
    expect(
      (await defaultStorage.get([toNumericVariableEnums(key)]))[0].value
    ).toBeUndefined();
    expect(
      (await prefixSessionStorage1.get([stripPrefix(prefixedKey)]))[0].value
    ).toBe("abc");

    await coordinator.set([
      {
        ...key,
        scope: "device",
        purposes: "necessary",
        classification: "anonymous",
        value: "dabc",
      },
    ]);

    expect(
      (await defaultStorage.get([{ ...key, scope: VariableScope.Device }]))[0]
        ?.value
    ).toBe("dabc");
  });

  it("Queries", async () => {
    const { coordinator } = setupStorage();

    await coordinator.set([
      { scope: "session", key: "test", targetId: "test", value: "test" },
    ]);
    let results = await coordinator.query([
      { scopes: [VariableScope.Session], keys: [":*"] },
    ]);

    expect(results.results.length).toBe(1);
    expect(results.results[0].key).toBe("test");

    await coordinator.set([
      {
        scope: "device",
        key: "deviceTest",
        targetId: "test",
        value: "test",
      },
    ]);

    results = await coordinator.query([
      { scopes: [VariableScope.Session], keys: [":*"] },
    ]);

    expect(results.results.length).toBe(1);
    expect(results.results[0].key).toBe("test");

    results = await coordinator.query([{ keys: [":*"] }]);

    expect(results.results.length).toBe(2);
    expect(results.results.map((result) => result.key).sort()).toEqual([
      "deviceTest",
      "test",
    ]);
  });

  it("Validates", async () => {
    const { coordinator } = setupStorage();

    // Validation of schema bound variables.
    expect(
      (
        await coordinator.set([
          { scope: "session", key: "test", targetId: "foo", value: "ok" },
        ])
      )[0].status
    ).toBe(VariableStatus.Created);

    // Validation of schema bound variables.
    expect(
      (
        await coordinator.set([
          { scope: "session", key: "test", targetId: "bar", value: "ok" },
        ])
      )[0].status
    ).toBe(VariableStatus.Created);

    // Cannot set again (to check that targets gets considered.)
    expect(
      (
        await coordinator.set([
          { scope: "session", key: "test", targetId: "bar", value: "ok" },
        ]).all
      )[0].status
    ).toBe(VariableStatus.Conflict);

    // Validation of schema bound variables.
    expect(
      (
        await coordinator.set([
          { scope: "session", key: "test", targetId: "foo", value: 32 },
        ]).all
      )[0]["error"] + ""
    ).toContain("must be string");

    // The validate function throws if error.
    await expect(
      async () =>
        (
          await coordinator.set([
            { scope: "session", key: "test", targetId: "foo", value: 32 },
          ])
        )[0]
    ).rejects.toThrow("must be string");

    // Require classification and purposes for variables that are not schema bound.
    const notDefinedResult = (
      await coordinator.set([
        { scope: "session", key: "notDefined", targetId: "foo", value: 32 },
      ]).all
    )[0];
    expect(notDefinedResult.status).toBe(VariableStatus.Invalid);
    expect((notDefinedResult as any).error + "").toContain("explicit");

    const testSetter = async (
      setter: VariableSetter,
      expectStatus: ResultStatusValue
    ) => {
      const result = (await coordinator.set([setter]).all)[0];
      expect(result.status).toBe(resultStatus(expectStatus));
    };

    await testSetter(
      {
        scope: "session",
        key: "test:prefixed",
        targetId: "foo",
        value: "ok",
      },
      "created"
    );
    await testSetter(
      {
        scope: "session",
        key: "test:test",
        targetId: "foo",
        value: "foo",
      },
      "invalid"
    );

    await testSetter(
      {
        scope: "session",
        key: "prefixed",
        targetId: "foo",
        value: "Should not be defined here.",
      },
      "invalid"
    );
    await testSetter(
      {
        scope: "session",
        key: "prefixed",
        targetId: "foo",
        patch: () => ({ value: "nope" }),
      },
      "invalid"
    );
    await testSetter(
      {
        scope: "session",
        key: "prefixed",
        targetId: "foo",
        purposes: "functionality",
        patch: () => ({ value: "nope", classification: "anonymous" }),
      },
      "created"
    );

    await testSetter(
      {
        scope: "session",
        key: "all:test",
        targetId: "foo",
        value: "ok",
      },
      "created"
    );

    await testSetter(
      {
        scope: "session",
        key: "all:prefixed",
        targetId: "foo",
        value: "ok",
      },
      "created"
    );

    // Also initializers.
    expect(
      (
        await coordinator.get([
          {
            scope: "global",
            key: "test123",
            init: () => ({ value: "ok" }),
          },
        ]).all
      )[0].status
    ).toBe(VariableStatus.Invalid);

    expect(
      (
        await coordinator.get([
          {
            scope: "global",
            key: "test123",
            purpose: "functionality",
            init: () => ({ classification: "direct", value: "ok" }),
          },
        ]).all
      )[0].status
    ).toBe(VariableStatus.Created);
  });

  it("Censors", async () => {
    const { coordinator } = setupStorage();

    expect(
      (
        await coordinator.set([
          { scope: "session", key: "censored", targetId: "foo", value: "ok" },
        ])
      )[0].status
    ).toBe(VariableStatus.Created);

    expect(
      (
        await coordinator.set(
          [{ scope: "session", key: "censored", targetId: "bar", value: "ok" }],
          {
            consent: { level: "anonymous", purposes: "necessary" },
          }
        ).all
      )[0].status
    ).toBe(VariableStatus.Denied);

    expect(
      (
        await coordinator.get(
          [
            {
              scope: "session",
              key: "censored",
              targetId: "bar",
              init: () => ({ value: "ok" }),
            },
          ],
          {
            consent: { level: "anonymous", purposes: "necessary" },
          }
        ).all
      )[0].status
    ).toBe(VariableStatus.Denied);

    expect(
      stripMetadata(
        (
          await coordinator.set(
            [
              {
                scope: "device",
                key: "censored",
                targetId: "foo",
                value: { value1: 10, value2: 20 },
              },
            ],
            { consent: { level: "anonymous", purposes: "necessary" } }
          )
        )[0].current?.value
      )
    ).toEqual({ value1: 10 });

    expect(
      stripMetadata(
        (
          await coordinator.get(
            [
              {
                scope: "device",
                key: "censored",
                targetId: "bar",
                init: () => ({ value: { value1: 10, value2: 20 } }),
              },
            ],
            { consent: { level: "anonymous", purposes: "necessary" } }
          )
        )[0].value
      )
    ).toEqual({ value1: 10 });

    expect(
      stripMetadata(
        (
          await coordinator.get(
            [
              {
                scope: "device",
                key: "censored",
                targetId: "baz",
                init: () => ({ value: { value1: 10, value2: 20 } }),
              },
            ],
            { consent: { level: "anonymous", purposes: "any" } }
          )
        )[0].value
      )
    ).toEqual({ value1: 10, value2: 20 });
  });
});
