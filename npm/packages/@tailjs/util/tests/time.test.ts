import { clock, createTimer as createTimer, delay } from "../src";

/** Time resolution. */
const EPS = 15;

describe("Timer functions works as well as they can be tested.", () => {
  it("Times", async () => {
    let timer = createTimer(false);
    expect(timer()).toBe(0);
    timer(true);
    await delay(2 * EPS);
    expect(timer()).toBeGreaterThan(0);

    timer = createTimer();
    await delay(1 * EPS);
    expect(timer()).toBeGreaterThan(0);
    let current = timer(false);
    await delay(1 * EPS);
    expect(timer()).toBe(current);
    timer(true);
    await delay(1 * EPS);
    expect(timer()).toBeGreaterThan(current);
  });
  it("Clocks ticks until stopped", async () => {
    let n = 0;
    const testClock = clock(() => ++n, 2 * EPS);
    await delay(1 * EPS);
    expect(n).toBe(0);
    await delay(1.5 * EPS);
    expect(n).toBe(1);
    await delay(2 * EPS);
    expect(n).toBe(2);
    testClock.toggle(false);
    await delay(2 * EPS);
    expect(n).toBe(2);
  });
  it("Clocks can tick once (like setTimeout)", async () => {
    let n = 0;
    const testClock = clock(() => {
      ++n;
    }, -2 * EPS);
    await delay(1 * EPS);
    expect(n).toBe(0);
    await delay(1.5 * EPS);
    expect(n).toBe(1);
    await delay(2 * EPS);
    expect(n).toBe(1);
    testClock.restart();
    await delay(3 * EPS);
    expect(n).toBe(2);
    testClock.restart();
    await delay(1 * EPS);
    expect(n).toBe(2);

    testClock.restart();
    await delay(1.5 * EPS);
    expect(n).toBe(2);

    testClock.restart();
    await delay(2.5 * EPS);
    expect(n).toBe(3);
  });
  it("Clocks can tick once and be finished prematurely", async () => {
    let n = 0;
    const testClock = clock(() => {
      ++n;
    }, -2 * EPS);
    await delay(1 * EPS);
    expect(n).toBe(0);
    await testClock.trigger();
    expect(n).toBe(1);
    await delay(1.5 * EPS);
    expect(n).toBe(1);
  });

  it("Clocks provide how long they have been running to the callback", async () => {
    let captured: [number, number][] = [];
    const testClock = clock((elapsed, delta) => {
      captured.push([elapsed, delta]);
    }, EPS);

    while (captured.length < 10) {
      await delay(EPS);
    }
    let prev = 0;
    for (const [elapsed, delta] of captured) {
      if (!prev) {
        expect(delta).toBe(elapsed);
      } else {
        expect(delta).toBeLessThan(elapsed);
      }
      expect(elapsed).toBeGreaterThan(prev);
      prev = elapsed;
    }

    let elapsedBeforeReset = prev;
    captured = [];
    testClock.restart();
    while (captured.length < 1) {
      await delay(1 * EPS);
    }
    expect(captured[0][0]).toBeLessThan(elapsedBeforeReset);

    testClock.toggle(false);
  });
});
