import { VariableScope } from "@tailjs/types";
import { map } from "@tailjs/util";
import { TargetedVariableCollection } from "../src/storage/TargetedVariableCollection";

describe("TargetedVariableCollection", () => {
  it("Can get items, and add items if an initializer is provided..", () => {
    const variables = new TargetedVariableCollection<number>();

    expect(
      variables.get({ scope: "device", key: "test", targetId: "t1" })
    ).toBeUndefined();
    expect(
      variables.get({ scope: "device", key: "test", targetId: "t1" }, () => 10)
    ).toBe(10);
    expect(
      variables.get({ scope: "device", key: "test", targetId: "t1" })
    ).toBe(10);

    expect(
      variables.get({ scope: "device", key: "test", targetId: "t2" })
    ).toBeUndefined();
    expect(
      variables.get({ scope: "device", key: "test2", targetId: "t1" })
    ).toBeUndefined();
    expect(
      variables.get({ scope: "session", key: "test", targetId: "t1" })
    ).toBeUndefined();

    expect(variables.size).toBe(1);

    expect(
      variables.get({ scope: "device", key: "test", targetId: "t2" }, () => 2)
    ).toBe(2);
    expect(
      variables.get({ scope: "session", key: "test", targetId: "t1" }, () => 3)
    ).toBe(3);

    expect(variables.get("t1").size).toBe(2);
    expect(variables.get("t2").size).toBe(1);
    expect(variables.get("t3")?.size).toBeUndefined();
    expect(variables.size).toBe(3);

    expect(
      variables.has({ scope: "device", key: "test", targetId: "t2" })
    ).toBe(true);
    expect(
      variables.has({ scope: "device", key: "test", targetId: "t3" })
    ).toBe(false);

    expect(map(variables)).toEqual([
      [{ scope: VariableScope.Device, key: "test", targetId: "t1" }, 10],
      [{ scope: VariableScope.Session, key: "test", targetId: "t1" }, 3],
      [{ scope: VariableScope.Device, key: "test", targetId: "t2" }, 2],
    ]);

    expect([...variables.targets(true)]).toEqual(["t1", "t2"]);
    expect(
      [...variables.targets()].map(([key, value]) => [key, value.size])
    ).toEqual([
      ["t1", 2],
      ["t2", 1],
    ]);
  });

  it("Sets", () => {
    const variables = new TargetedVariableCollection<number>();

    expect(
      variables.get({ scope: "entity", key: "abc", targetId: "t1" })
    ).toBeUndefined();
    variables.set(
      { scope: VariableScope.Entity, key: "abc", targetId: "t1" },
      10
    );
    expect(variables.get({ scope: "entity", key: "abc", targetId: "t1" })).toBe(
      10
    );

    expect(
      variables.update(
        { scope: "device", key: "abc", targetId: "t1" },
        (current) => (current ?? -1) + 1
      )
    ).toBe(0);

    expect(
      variables.update(
        { scope: "device", key: "abc", targetId: "t1" },
        (current) => current! + 1
      )
    ).toBe(1);
    expect(
      variables.update(
        { scope: "device", key: "abc", targetId: "t1" },
        (current) => current! + 10
      )
    ).toBe(11);

    expect(variables.size).toBe(2);

    variables.clear();
    expect(variables.size).toBe(0);
  });
});
