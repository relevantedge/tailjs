import { DataClassification, DataPurposes } from "@tailjs/types";
import { SchemaManager } from "../src";
import { TestEvent3, TestType1, testSchema1 } from "./test-schemas";

type AllowExtraProperties<T> = T extends object | any[]
  ? Record<keyof any, any> & { [P in keyof T]: AllowExtraProperties<T[P]> }
  : T;

describe("SchemaManager.", () => {
  it("Validates and censors", () => {
    const manager = new SchemaManager([testSchema1]);

    const testItem = <T, P extends number = 0>(
      data: P extends 1
        ? Partial<T>
        : P extends 2
        ? AllowExtraProperties<T>
        : P extends 3
        ? Partial<AllowExtraProperties<T>>
        : T
    ): T => data as any;

    const data = testItem<TestType1>({
      testNumber: 20,
      testReference: {
        nestedNumber: 11,
        nestedReference: {
          testNumber: 20,
        },
      },
      testArray: [
        { testDate: "2023-01-01T00:00:00Z", anonymousString: "gazonk" },
      ],
    });

    expect(manager.validate("urn:tailjs:core#Type1", data)).toBe(data);

    expect(() =>
      manager.validate(
        "urn:acme:other#TestEvent3",
        testItem<TestEvent3>({
          type: "current_name",
          sharedNumber: 32,
          sharedItems: [{ n: 32 }],
        })
      )
    ).not.toThrow();

    expect(() =>
      manager.validate(
        "urn:acme:other#TestEvent3",
        testItem<TestEvent3, 1>({
          type: "current_name",
          sharedItems: [{ n: 32 }],
        })
      )
    ).toThrow("sharedNumber");

    expect(() =>
      manager.validate(
        "urn:acme:other#TestEvent3",
        testItem<TestEvent3, 2>({
          type: "current_name",
          sharedNumber: 10,
          sharedItems: [{ n: 32, z: false }],
        })
      )
    ).toThrow("unevaluatedProperty: z");

    expect(() =>
      manager.validate(
        "urn:acme:other#TestEvent2",
        testItem<TestEvent3>({
          type: "current_name",
          sharedNumber: 32,
          sharedItems: [{ n: 32 }],
        })
      )
    ).toThrow("abstract");

    expect(
      manager.censor("urn:tailjs:core#Type1", data, {
        classification: DataClassification.Sensitive,
        purposes: DataPurposes.Any,
      })
    ).toEqual(data);

    expect(
      manager.censor("urn:tailjs:core#Type1", data, {
        classification: DataClassification.Anonymous,
        purposes: DataPurposes.Any,
      })
    ).toEqual(
      testItem<typeof data>({
        testNumber: data.testNumber,
        testArray: [
          {
            anonymousString: "gazonk",
          },
        ],
      })
    );

    expect(
      manager.getVariable({ scope: "session", key: "test" })?.classification
    ).toBe(DataClassification.Indirect);

    expect(
      manager.getVariable({ scope: "session", key: "404" })
    ).toBeUndefined();

    expect(manager.tryValidate({ scope: "session", key: "test" }, 20)).toBe(20);

    expect(
      manager.tryValidate({ scope: "session", key: "test" }, "test")
    ).toBeUndefined();

    //expect(manager.validateVariableUniqueness().length).toBe(2);
  });
});
