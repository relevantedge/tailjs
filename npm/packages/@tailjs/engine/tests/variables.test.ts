import type { Tracker } from "../src/Tracker";
import { InMemoryStorage } from "../src/extensions";

describe("Variable stores store.", () => {
  const fakeTracker: Tracker = {
    sessionId: "session123",
    deviceId: "device123",
    deviceSessionId: "deviceSession123",
  } as any;

  it("Is the case for InMemoryStore.", async () => {
    const store = new InMemoryStorage();

    expect(store.get("test")).toBeUndefined();
  });
});
