import {
  VariableKey,
  VariableResultStatus,
  VariableScope,
  VariableSetter,
  stripPrefix,
  toNumericVariable,
} from "@tailjs/types";
import {
  InMemoryStorage,
  SchemaManager,
  VariableStorageCoordinator,
} from "../src";
import { prefixedVariableSchema, variablesSchema } from "./test-schemas";

describe("VariableStorageCoordinator", () => {
  const setupStorage = () => {
    const schemaManager = new SchemaManager([
      variablesSchema,
      prefixedVariableSchema,
    ]);

    const defaultStorage = new InMemoryStorage();
    const sessionStorage = new InMemoryStorage().asValidating();
    const prefixSessionStorage1 = new InMemoryStorage().asValidating();
    const prefixSessionStorage2 = new InMemoryStorage().asValidating();

    const coordinator = new VariableStorageCoordinator({
      mappings: {
        default: { storage: defaultStorage, schema: "urn:variables:default" },
        session: {
          "": { storage: sessionStorage, schema: "urn:variables:default" },
          test: {
            storage: prefixSessionStorage1,
            schema: ["urn:variables:prefixed"],
          },
          all: { storage: prefixSessionStorage2, schema: "*" },
        },
      },
      schema: schemaManager,
    });

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
    const key: VariableKey = { scope: "session", key: "test", targetId: "foo" };
    const prefixedKey = { ...key, key: "test:prefixed" };
    expect((await coordinator.get([key]))[0].value).toBeUndefined();

    expect((await coordinator.set([{ ...key, value: "32" }]))[0].status).toBe(
      VariableResultStatus.Success
    );
    expect((await coordinator.set([{ ...key, value: "32" }]))[0].status).toBe(
      VariableResultStatus.Conflict
    );

    expect((await coordinator.get([key]))[0].value).toBe("32");
    expect((await sessionStorage.get([key]))[0].value).toBe("32");
    expect(
      (await defaultStorage.get([toNumericVariable(key)]))[0].value
    ).toBeUndefined();

    expect(
      (await coordinator.set([{ ...prefixedKey, value: "abc" }]))[0].validate()
        .status
    ).toBe(VariableResultStatus.Success);
    expect((await coordinator.get([key]))[0].value).toBe("32");
    expect((await coordinator.get([prefixedKey]))[0].value).toBe("abc");

    expect((await sessionStorage.get([prefixedKey]))[0].value).toBeUndefined();
    expect(
      (await defaultStorage.get([toNumericVariable(key)]))[0].value
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

  it("Validates", async () => {
    const { coordinator } = setupStorage();

    // Validation of schema bound variables.
    expect(
      (
        await coordinator.set([
          { scope: "session", key: "test", targetId: "foo", value: "ok" },
        ])
      )[0].validate().status
    ).toBe(VariableResultStatus.Success);

    // Validation of schema bound variables.
    expect(
      (
        await coordinator.set([
          { scope: "session", key: "test", targetId: "foo", value: 32 },
        ])
      )[0]["error"] + ""
    ).toContain("must be string");

    // The validate function throws if error.
    await expect(async () =>
      (
        await coordinator.set([
          { scope: "session", key: "test", targetId: "foo", value: 32 },
        ])
      )[0].validate()
    ).rejects.toThrow("must be string");

    // Require classification and purposes for variables that are not schema bound.
    const notDefinedResult = (
      await coordinator.set([
        { scope: "session", key: "notDefined", targetId: "foo", value: 32 },
      ])
    )[0];
    expect(notDefinedResult.status).toBe(VariableResultStatus.Denied);
    expect((notDefinedResult as any).error + "").toContain("explicit");

    const testSetter = async (
      setter: VariableSetter,
      expectSuccess: boolean
    ) => {
      const result = (await coordinator.set([setter]))[0];
      expect(result.status).toBe(
        expectSuccess
          ? VariableResultStatus.Success
          : VariableResultStatus.Denied
      );
    };

    await testSetter(
      {
        scope: "session",
        key: "test:prefixed",
        targetId: "foo",
        value: "ok",
      },
      true
    );
    await testSetter(
      {
        scope: "session",
        key: "test:test",
        targetId: "foo",
        value: "foo",
      },
      false
    );

    await testSetter(
      {
        scope: "session",
        key: "prefixed",
        targetId: "foo",
        value: "Should not be defined here.",
      },
      false
    );
    await testSetter(
      {
        scope: "session",
        key: "prefixed",
        targetId: "foo",
        patch: () => ({ value: "nope" }),
      },
      false
    );
    await testSetter(
      {
        scope: "session",
        key: "prefixed",
        targetId: "foo",
        purposes: "functionality",
        patch: () => ({ value: "nope", classification: "anonymous" }),
      },
      true
    );

    await testSetter(
      {
        scope: "session",
        key: "all:test",
        targetId: "foo",
        value: "ok",
      },
      true
    );

    await testSetter(
      {
        scope: "session",
        key: "all:prefixed",
        targetId: "foo",
        value: "ok",
      },
      true
    );

    // Also initializers.
    expect(
      (
        await coordinator.get([
          {
            scope: "global",
            key: "test123",
            targetId: "test",
            initializer: () => ({ value: "ok" }),
          },
        ])
      )[0].status
    ).toBe(VariableResultStatus.Denied);

    expect(
      (
        await coordinator.get([
          {
            scope: "global",
            key: "test123",
            targetId: "test",
            purpose: "functionality",
            initializer: () => ({ classification: "direct", value: "ok" }),
          },
        ])
      )[0].status
    ).toBe(VariableResultStatus.Success);
  });
});
