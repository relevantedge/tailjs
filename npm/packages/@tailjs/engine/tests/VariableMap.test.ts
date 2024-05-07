import { map } from "@tailjs/util";
import { VariableMap } from "../src/storage/VariableMap";
import { VariableScope } from "@tailjs/types";

describe("VariableMap", () => {
  it("Can get items, and add items if an initializer is provided.", () => {
    const variables = new VariableMap<number>();

    expect(variables.get("device", "test")).toBeUndefined();
    expect(variables.get("device", "test", () => 10)).toBe(10);
    expect(variables.get("device", "test")).toBe(10);
    expect(variables.get("device", "test2")).toBeUndefined();
    expect(variables.get("session", "test")).toBeUndefined();
    expect(variables.get("global", "test", () => 3)).toBe(3);

    expect(variables.get({ scope: "global", key: "test" })).toBe(3);
    expect(variables.get({ scope: "device", key: "test" })).toBe(10);
    expect(variables.get({ scope: "session", key: "test" })).toBeUndefined();

    expect(variables.size).toBe(2);

    expect(variables.has("global")).toBe(true);
    expect(variables.has("entity")).toBe(false);
    expect(variables.has("global", "test2")).toBe(false);
    expect(variables.has("global", "test")).toBe(true);
    expect(variables.has({ scope: "global", key: "test" })).toBe(true);

    expect(map(variables)).toEqual([
      [[VariableScope.Device, "test"], 10],
      [[VariableScope.Global, "test"], 3],
    ]);
  });

  it("Sets", () => {
    const variables = new VariableMap<number>();

    expect(variables.get("entity", "abc")).toBeUndefined();
    variables.set("entity", "abc", 10);
    expect(variables.get("entity", "abc")).toBe(10);
    variables.set("entity", "abc", 15);
    expect(variables.get("entity", "abc")).toBe(15);
    expect(variables.size).toBe(1);
    let captured: any;
    variables.update("device", "abc", (current) => ((captured = current), 11));
    expect(captured).toBeUndefined();
    expect(variables.get("device", "abc")).toBe(11);
    variables.update(
      { scope: "device", key: "abc" },
      (current) => ((captured = current), 12)
    );
    expect(captured).toBe(11);
    expect(variables.get("device", "abc")).toBe(12);
    expect(variables.size).toBe(2);
    variables.set("entity", "abc", undefined);
    expect(variables.size).toBe(1);
    expect(variables.get("entity", "abc")).toBeUndefined();

    variables.set([
      [{ scope: "session", key: "test1" }, 1],
      [["session", "test2"], 2],
    ] as const);

    expect(variables.size).toBe(3);
    expect(variables.get("session", "test1")).toBe(1);
    expect(variables.get("session", "test2")).toBe(2);

    expect(variables.delete("session")).toBe(true);
    expect(variables.get("session", "test1")).toBeUndefined();
    expect(variables.get("device", "abc")).toBe(12);

    expect(variables.size).toBe(1);
    variables.clear();
    expect(variables.get("device", "abc")).toBeUndefined();

    expect(variables.size).toBe(0);
  });
});
