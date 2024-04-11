import { SetStatus } from "@tailjs/types";
import {
  InMemoryStorage,
  SchemaManager,
  VariableStorageCoordinator,
} from "../src";
import {
  bigSchema,
  prefixedVariableSchema,
  variablesSchema,
} from "./test-schemas";
import { Head } from "@tailjs/util";

describe("VariableStorageCoordinator", () => {
  it("Splits", async () => {
    const schemaManager = new SchemaManager([
      variablesSchema,
      prefixedVariableSchema,
    ]);

    const defaultStorage = new InMemoryStorage();
    const sessionStorage = new InMemoryStorage();
    const prefixSessionStorage1 = new InMemoryStorage();
    const prefixSessionStorage2 = new InMemoryStorage();

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

    expect(
      (
        await coordinator.get([
          { scope: "session", key: "test", targetId: "foo" },
        ])
      )[0]
    ).toBeUndefined();

    expect(
      (
        await coordinator.set([
          { scope: "session", key: "test", targetId: "foo", value: 32 },
        ])
      )[0]?.status
    ).toBe(SetStatus.Success);

    const notDefinedResult = (
      await coordinator.set([
        { scope: "session", key: "notDefined", targetId: "foo", value: 32 },
      ])
    )[0];
    expect(notDefinedResult.status).toBe(SetStatus.Denied);
    expect((notDefinedResult as any).error + "").toContain("explicit");
  });
});
