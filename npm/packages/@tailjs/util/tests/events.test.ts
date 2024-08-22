import { createChainedEvent } from "../src";

describe("Events are fired in the right order", () => {
  it("Handles chained events well", () => {
    const [register, invoke] = createChainedEvent<number>();

    const [unbind0, rebind0] = register((next) => {
      return next() + 1;
    });

    const [unbind1, rebind1] = register((next) => {
      return 12;
    });

    const [unbind2, rebind2] = register((next) => {
      return next() + 4;
    }, -1);

    expect(invoke()).toBe(17);
    unbind2();
    expect(invoke()).toBe(13);
    rebind2();
    expect(invoke()).toBe(17);
    unbind0();
    expect(invoke()).toBe(16);
    rebind0();
    expect(invoke()).toBe(17);
    unbind2();
    unbind0();
    rebind2();
    rebind0();
    expect(invoke()).toBe(17);
    unbind0();
    unbind1();
    unbind2();
    expect(invoke()).toBeUndefined();
    rebind1();
    expect(invoke()).toBe(12);
    rebind2();
    expect(invoke()).toBe(16);
    rebind0();
    expect(invoke()).toBe(17);
  });

  it("Can unbind on the fly", async () => {
    const [register, invoke] = createChainedEvent<Promise<number>>();
    register(async (next, unbind) => (unbind(), await next()) + 1);
    register(async (next) => 14);
    expect(await invoke()).toBe(15);
  });

  it("Can also chain async events", async () => {
    const [register, invoke] = createChainedEvent<Promise<number>>();
    register(async (next) => (await next()) + 1);
    register(async (next) => 14);
    expect(await invoke()).toBe(15);
  });

  it("Can chain events with arguments", () => {
    const [register, invoke] = createChainedEvent<number, [seed: number]>();
    const [unbind] = register((seed, next) => seed + next(seed + 1));
    register((seed, next) => seed);

    expect(invoke(1)).toBe(3);

    // Pass default parameters if none specified.
    unbind();
    register((seed, next) => next(), 0);
    expect(invoke(1)).toBe(1);
  });
});
