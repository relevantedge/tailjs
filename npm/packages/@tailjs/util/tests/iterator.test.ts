import { forEach, forEach2, forEach2Basic, map, mapFiltered } from "../src";

describe("Iterator functionality iterates iterably", () => {
  it("Makes ranges", () => {
    expect(map(4)).toEqual([0, 1, 2, 3]);
    expect(map(6, (i) => (i % 2 ? i : undefined))).toEqual([1, 3, 5]);
    expect(map(5, undefined, 2)).toEqual([2, 3, 4]);
  });

  it("Projects iterables (which are not strings).", () => {
    expect(map(["a", "b", "c"])).toEqual(["a", "b", "c"]);
    //expect(map(["a", "b", "c"])).toEqual(["a", "b", "c"]);
    expect(map("abc")).not.toEqual(["a", "b", "c"]);
  });

  function* source() {
    yield 1;
    yield 2;
    yield 3;
  }

  let perfs: [number, number][] = [];
  for (let run = 0; run < 100; run++) {
    const perf = [0, 0];
    let t0 = performance.now();
    //  const source = [1, 2, 3];
    let n1 = 0;
    for (let i = 0; i < 1000; i++) {
      forEach2Basic(source(), (item) => (n1 += item));
    }
    perf[0] = performance.now() - t0;
    t0 = performance.now();
    let n2 = 0;

    for (let i = 0; i < 1000; i++) {
      forEach2(source(), (item) => (n2 += item));
    }

    if (n1 !== n2) {
      throw new Error(`Nix ${n1} vs ${n2}`);
    }
    perf[1] = performance.now() - t0;
    perfs.push(perf as any);
  }

  let ps1 = 0;
  let ps2 = 0;
  let np = 0;
  for (const [p1, p2] of perfs) {
    if (np++ > 5) {
      ps1 += p1;
      ps2 += p2;
    }
  }
  ps1 /= np - 3;
  ps2 /= np - 3;

  console.log(
    `${ps1.toFixed(2)} ms vs. ${ps2.toFixed(2)} ms (diff ${(ps2 - ps1).toFixed(
      2
    )} ms/${(100 * (ps2 / ps1)).toFixed(2)} %).`
  );

  // it("Projects strings as characters with code points", () =>
  //   expect(map("abc")).toEqual([
  //     ["a", 97],
  //     ["b", 98],
  //     ["c", 99],
  //   ]));

  it("Offsets and peeks", () => {});

  it("Skips", () => {
    const dummy = ["A", "B", "C", "D", "E"];
    expect(map(dummy, (value, i, { skip }) => (i ? value : skip()))).toEqual([
      "C",
      "D",
      "E",
    ]);

    expect(
      map(dummy, (value, i, { skip }) => (i !== 1 ? value : skip(2)))
    ).toEqual(["A", "E"]);

    let itHappened = false;
    forEach(
      [1, 2],
      (value, i, { next }) => ((itHappened = true), expect(next()).toEqual(2))
    );
    expect(itHappened).toEqual(true);
  });

  it("Returns", () => {
    expect(forEach(3, (value) => value)).toEqual(2);
  });

  it("Filters", () => {
    expect(mapFiltered(3, (n) => n % 2)).toEqual([1]);
  });
});
