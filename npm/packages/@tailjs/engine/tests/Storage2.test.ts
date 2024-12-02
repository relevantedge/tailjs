import { VariableResultStatus, VariableSuccessResult } from "@tailjs/types";
import { InMemoryStorage } from "../src";

describe("MemoryStorage", () => {
  it("CRUDs", async () => {
    const storage = new InMemoryStorage();
    let variable = (
      await storage.get([{ scope: "test", key: "test", entityId: "test" }])
    )[0];
    expect(variable.status).toBe(VariableResultStatus.NotFound);

    expect(
      (
        await storage.set([
          { scope: "test", key: "test", entityId: "test", value: "test" },
        ])
      )[0]
    ).toMatchObject({ status: VariableResultStatus.Created });

    variable = (
      await storage.get([{ scope: "test", key: "test", entityId: "test" }])
    )[0] as VariableSuccessResult;
    expect(variable).toMatchObject({
      status: VariableResultStatus.Success,
      value: "test",
    });

    expect(
      (
        await storage.set([
          { scope: "test", key: "test", entityId: "test", value: null },
        ])
      )[0]
    ).toMatchObject({ status: VariableResultStatus.Conflict });

    expect(
      (
        await storage.get([{ scope: "test2", key: "test", entityId: "test" }])
      )[0]
    ).toMatchObject({ status: VariableResultStatus.NotFound });

    const { variables: results } = await storage.query([
      { scope: "test", entityIds: ["test"] },
    ]);
    expect(results.length).toBe(1);
    expect(results[0]).toMatchObject({ value: "test" });

    expect(
      (
        await storage.set([
          {
            scope: "test",
            key: "test",
            entityId: "test",
            version: variable.version,
            value: null,
          },
        ])
      )[0]
    ).toMatchObject({ status: VariableResultStatus.Success });

    variable = (
      await storage.get([{ scope: "test", key: "test", entityId: "test" }])
    )[0];
    expect(variable.status).toBe(VariableResultStatus.NotFound);
  });
});
