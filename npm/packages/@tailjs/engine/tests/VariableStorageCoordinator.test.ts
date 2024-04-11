import { SetStatus } from "@tailjs/types";
import {
  InMemoryStorage,
  SchemaManager,
  VariableStorageCoordinator,
} from "../src";
import { bigSchema, variablesSchema } from "./test-schemas";
import { Head } from "@tailjs/util";

describe("VariableStorageCoordinator", () => {
  it("Splits", async () => {
    const schemaManager = new SchemaManager(variablesSchema);
    const coordinator = new VariableStorageCoordinator({
      mappings: {
        session: { storage: new InMemoryStorage(), schemas: "*" },
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
  });
});
