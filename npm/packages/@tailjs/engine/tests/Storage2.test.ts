import { VariableResultStatus, VariableSuccessResult } from "@tailjs/types";
import { InMemoryStorage } from "../src";

describe("The new", () => {
  it("News", async () => {
    const storage = new InMemoryStorage();
    let x = (
      await storage.get([{ scope: "test", key: "test", entityId: "test" }])
    )[0];
    expect(x.status).toBe(VariableResultStatus.NotFound);

    expect(
      (
        await storage.set([
          { scope: "test", key: "test", entityId: "test", value: "test" },
        ])
      )[0]
    ).toMatchObject({ status: VariableResultStatus.Created });

    x = (
      await storage.get([{ scope: "test", key: "test", entityId: "test" }])
    )[0] as VariableSuccessResult;
    expect(x).toMatchObject({
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

    const results = await storage.query([{ scope: "test", entityId: "test" }]);
    expect(results.length).toBe(1);
    expect(results[0]).toMatchObject({ value: "test" });

    expect(
      (
        await storage.set([
          {
            scope: "test",
            key: "test",
            entityId: "test",
            version: x.version,
            value: null,
          },
        ])
      )[0]
    ).toMatchObject({ status: VariableResultStatus.Success });

    x = (
      await storage.get([{ scope: "test", key: "test", entityId: "test" }])
    )[0];
    expect(x.status).toBe(VariableResultStatus.NotFound);
  });
});
