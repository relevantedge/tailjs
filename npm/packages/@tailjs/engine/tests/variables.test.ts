import { DataClassification, VariableScope } from "@tailjs/types";
import { InMemoryStorage, Tracker } from "../src";

describe("Variable stores store.", () => {
  const fakeTracker: Tracker = {
    sessionId: "session123",
    deviceId: "device123",
    deviceSessionId: "deviceSession123",
  } as any;

  it("Is the case for InMemoryStore.", async () => {
    const store = new InMemoryStorage();

    expect(
      (await store.get([{ key: "test", scope: VariableScope.Global }]))[0]
    ).toBeUndefined();

    await store.set([
      {
        key: "test",
        scope: "global",
        classification: DataClassification.Direct,
        value: "test",
      },
    ]);
  });
});
