import { clock, timer as createTimer, delay } from "../src";

describe("Timer functions works as well as they can be tested.", () => {
  it("Times.", async () => {
    let timer = createTimer(false);
    expect(timer()).toBe(0);
    timer(true);
    await delay(10);
    expect(timer()).toBeGreaterThan(0);

    timer = createTimer();
    await delay(10);
    expect(timer()).toBeGreaterThan(0);
    let current = timer(false);
    await delay(10);
    expect(timer()).toBe(current);
    timer(true);
    await delay(10);
    expect(timer()).toBeGreaterThan(current);
  });
  it("Clocks ticks until stopped.", async () => {
    let n = 0;
    const testClock = clock(() => ++n, 20);
    await delay(10);
    expect(n).toBe(0);
    await delay(15);
    expect(n).toBe(1);
    await delay(20);
    expect(n).toBe(2);
    testClock.toggle(false);
    await delay(20);
    expect(n).toBe(2);
  });
  it("Clocks can tick once (like setTimeout).", async () => {
    let n = 0;
    const testClock = clock(() => ++n, -20);
    await delay(10);
    expect(n).toBe(0);
    await delay(15);
    expect(n).toBe(1);
    await delay(20);
    expect(n).toBe(1);
    testClock.restart();
    await delay(30);
    expect(n).toBe(2);
    testClock.restart();
    await delay(10);
    expect(n).toBe(2);

    testClock.restart();
    await delay(15);
    expect(n).toBe(2);

    testClock.restart();
    await delay(25);
    expect(n).toBe(3);
  });
  it("Clocks can tick once and be finished prematurely.", async () => {
    let n = 0;
    const testClock = clock(() => ++n, -20);
    await delay(10);
    expect(n).toBe(0);
    await testClock.trigger();
    expect(n).toBe(1);
    await delay(15);
    expect(n).toBe(1);
  });
});