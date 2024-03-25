import {
  VariableHeader,
  VariableKey,
  VariableSetStatus,
  setStatus,
} from "@tailjs/types";
import { InMemoryStorage, Tracker } from "../src";

describe("Variable stores store.", () => {
  const fakeTracker: Tracker = {
    sessionId: "session123",
    deviceId: "device123",
    deviceSessionId: "deviceSession123",
  } as any;

  it("InMemoryStore handles get/set.", async () => {
    const store = new InMemoryStorage();

    const key: VariableKey = {
      key: "test",
      scope: "global",
    };
    // expect((await store.get([{ ...key }]))[0]).toBeUndefined();

    expect(
      (
        await store.set([
          {
            ...key,
            classification: "direct",
            value: "test",
          },
        ])
      )[0].status
    ).toBe(VariableSetStatus.Success);

    expect((await store.get([{ ...key }]))[0]?.value).toBe("test");

    const sessionKeys = ["1", "2", "123"].map(
      (targetId) =>
        ({
          ...key,
          scope: "session",
          targetId,
        } as VariableKey)
    );

    expect(await store.get(sessionKeys)).toEqual([
      undefined,
      undefined,
      undefined,
    ]);

    const setSessions = await store.set(
      sessionKeys.map((key, i) => ({
        ...key,
        classification: "direct",
        value: `test${i}`,
      }))
    );
    expect(
      setSessions.map((result) => [result.status, result.current?.value])
    ).toEqual([
      [setStatus.success, "test0"],
      [setStatus.success, "test1"],
      [setStatus.success, "test2"],
    ]);
  });

  it("InMemoryStore handles version conflicts.", async () => {
    const key: VariableHeader<false> = {
      scope: "user",
      targetId: "u",
      key: "test",
      classification: "direct",
    };

    const store = new InMemoryStorage();
    let result = (await store.set([{ ...key, value: "value1" }]))[0];
    expect(result?.status).toBe(VariableSetStatus.Success);

    expect(
      (result = (await store.set([{ ...key, value: "value1" }]))[0])?.status
    ).toBe(VariableSetStatus.Conflict);

    expect(result.current?.version).toBeDefined();
    expect(
      (result = (
        await store.set([
          { ...key, value: "value1", version: result.current!.version },
        ])
      )[0])?.status
    ).toBe(VariableSetStatus.Success);
  });
});
