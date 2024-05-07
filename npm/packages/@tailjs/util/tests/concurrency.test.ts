import { createLock, createTimer, delay, race } from "@tailjs/util";

describe("concurrency.ts", () => {
  it("Locks", async () => {
    let hasLock = false;

    const lock = createLock();
    const criticalRegion = async () => {
      if (hasLock === (hasLock = true)) throw new Error("Race condition.");
      await delay(100);
      hasLock = false;
      return 1;
    };

    const timer = createTimer();
    expect(
      await Promise.all([
        lock(criticalRegion, 1000),
        lock(criticalRegion, 1000),
        lock(criticalRegion, 1000),
      ])
    ).toEqual([1, 1, 1]);

    expect(timer()).toBeGreaterThan(300); // Critical region delays.
    expect(timer()).toBeLessThan(900); // Timeout.

    lock();
    expect(await race(lock(), delay(200, "timeout"))).toBe("timeout");
  });
});
