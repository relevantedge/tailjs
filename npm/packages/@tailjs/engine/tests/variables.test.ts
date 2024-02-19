import type { Tracker } from "../src/Tracker";
import { InMemoryStore } from "../src/extensions/InMemoryStorage";

describe("Variable stores store.", () => {
  const fakeTracker: Tracker = {
    sessionId: "session123",
    deviceId: "device123",
    deviceSessionId: "deviceSession123",
  } as any;

  it("Is the case for InMemoryStore.", async () => {
    const store = new InMemoryStore();

    expect(
      await store.get([{ scope: "session", key: "test" }], fakeTracker)
    ).toEqual({
      session: {
        test: undefined,
      },
    });
  });
});
