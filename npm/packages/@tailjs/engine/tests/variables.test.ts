import { VariableKey, VariableSetStatus } from "@tailjs/types";
import { InMemoryStorage, Tracker } from "../src";

describe("Variable stores store.", () => {
  const fakeTracker: Tracker = {
    sessionId: "session123",
    deviceId: "device123",
    deviceSessionId: "deviceSession123",
  } as any;

  it("Is the case for InMemoryStore.", async () => {
    const store = new InMemoryStorage();

    const key: VariableKey = {
      key: "test",
      scope: "global",
    };
    expect((await store.get([{ ...key }]))[0]).toBeUndefined();

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

    // expect((await store.get([{ ...key }]))[0]?.value).toBe("test");
  });
});
