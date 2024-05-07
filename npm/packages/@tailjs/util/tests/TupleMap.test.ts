import { DoubleMap, TupleMap } from "../src";

describe("TupleMap", () => {
  const mapVariations = <K extends readonly [any, any], V>() => [
    new DoubleMap<K, V>(false),
    new DoubleMap<K, V>(true),
    new TupleMap<K, V>(),
  ];

  const reset = (map: DoubleMap | TupleMap) => {
    map.clear();
    map.set(["1.1", "2.1"], 1);
    map.set(["1.1", "2.2"], 2);
    map.set(["1.1", "2.3"], 3);
    map.set(["1.2", "2.1"], 4);
    map.set(["1.2", "2.2"], 5);
    map.set(["1.2", "2.3"], 6);
  };

  it("Gets, adds and deletes single keys", () => {
    for (const map of mapVariations()) {
      expect(map.size).toBe(0);
      expect(map.get(["test1", "test2"])).toBeUndefined();

      map.set(["test1", "test2"], 1337);
      expect(map.size).toBe(1);
      expect(map.get(["test1", "test2"])).toBe(1337);

      map.set(["test1", "test2"], 1338);
      expect(map.size).toBe(1);
      expect(map.get(["test1", "test2"])).toBe(1338);
      map.set(["test1", "test3"], 1339);
      expect(map.size).toBe(2);

      expect(map.get(["test1", "test2"])).toBe(1338);
      expect(map.get(["test1", "test3"])).toBe(1339);

      map.set(["test1", "test2"], undefined);
      expect(map.size).toBe(1);
      expect(map.get(["test1", "test2"])).toBeUndefined();
    }
  });

  it("Suports wildcards", () => {
    for (const map of mapVariations<[string, string], number>()) {
      if (!(map instanceof DoubleMap)) continue;

      reset(map);
      expect(map.size).toBe(6);
      expect(map.get(["1.1", "2.2"])).toBeDefined();
      map.delete(["1.1", undefined]);
      expect(map.size).toBe(3);
      expect(map.get(["1.1", "2.2"])).toBeUndefined();

      reset(map);
      expect(map.size).toBe(6);
      expect(map.get(["1.1", "2.2"])).toBeDefined();
      map.delete([undefined, "2.2"]);
      expect(map.size).toBe(4);
      expect(map.get(["1.1", "2.1"])).toBeDefined();
      expect(map.get(["1.2", "2.1"])).toBeDefined();

      expect(map.get(["1.1", "2.2"])).toBeUndefined();
      expect(map.get(["1.2", "2.2"])).toBeUndefined();
    }
  });

  it("Iterates", () => {
    for (const map of mapVariations<[string, string], number>()) {
      reset(map);
      expect([...map]).toEqual([
        [["1.1", "2.1"], 1],
        [["1.1", "2.2"], 2],
        [["1.1", "2.3"], 3],
        [["1.2", "2.1"], 4],
        [["1.2", "2.2"], 5],
        [["1.2", "2.3"], 6],
      ]);

      if (map instanceof DoubleMap) {
        expect([...map.iterate()]).toEqual([
          [["1.1", "2.1"], 1],
          [["1.1", "2.2"], 2],
          [["1.1", "2.3"], 3],
          [["1.2", "2.1"], 4],
          [["1.2", "2.2"], 5],
          [["1.2", "2.3"], 6],
        ]);

        expect([...map.iterate([undefined, undefined])]).toEqual([
          [["1.1", "2.1"], 1],
          [["1.1", "2.2"], 2],
          [["1.1", "2.3"], 3],
          [["1.2", "2.1"], 4],
          [["1.2", "2.2"], 5],
          [["1.2", "2.3"], 6],
        ]);

        expect([...map.iterate(["1.2", undefined])]).toEqual([
          [["1.2", "2.1"], 4],
          [["1.2", "2.2"], 5],
          [["1.2", "2.3"], 6],
        ]);

        expect([...map.iterate([undefined, "2.2"])]).toEqual([
          [["1.1", "2.2"], 2],
          [["1.2", "2.2"], 5],
        ]);
      }
    }
  });
});
