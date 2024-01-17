import { forEach, map, mapFiltered } from "../src";

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

  it("Projects strings as characters with code points", () =>
    expect(map("abc")).toEqual([
      ["a", 97],
      ["b", 98],
      ["c", 99],
    ]));

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
