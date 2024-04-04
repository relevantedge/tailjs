import { DataClassification, DataPurposes } from "@tailjs/types";
import { SchemaManager } from "../src";
import {
  CompositionTest1,
  PolyBase,
  PolyTest1,
  PolyType1,
  PolyType2,
  PolyType31,
  TestEvent3,
  TestEvent4,
  TestType1,
  bigSchema,
  compositionSchema,
  invalidPolymorphicSchema,
  polymorphicSchema,
  schemaHeader,
  systemEvents,
} from "./test-schemas";

type AtLeast<T> = T extends object | any[]
  ? Record<keyof any, any> & { [P in keyof T]: AtLeast<T[P]> }
  : T;

type AtLeastPartial<T> = Partial<AtLeast<T>>;

describe("SchemaManager.", () => {
  it("Validates and censors", () => {
    const manager = new SchemaManager([bigSchema]);

    const data: TestType1 = {
      testNumber: 20,
      testNumber2: 22,
      testReference: {
        nestedNumber: 11,
        nestedReference: {
          testNumber: 20,
        },
      },
      testArray: [
        { testDate: "2023-01-01T00:00:00Z", anonymousString: "gazonk" },
      ],
    };

    expect(manager.validate("urn:tailjs:core#Type1", data)).toBe(data);

    expect(() =>
      manager.validate<TestEvent3>("urn:acme:other#TestEvent3", {
        type: "current_name",
        sharedNumber: 32,
        sharedItems: [{ n: 32 }],
      })
    ).not.toThrow();

    expect(() =>
      manager.validate<Partial<TestEvent3>>("urn:acme:other#TestEvent3", {
        type: "current_name",
        sharedItems: [{ n: 32 }],
      })
    ).toThrow("sharedNumber");

    expect(() =>
      manager.validate<AtLeast<TestEvent3>>("urn:acme:other#TestEvent3", {
        type: "current_name",
        sharedNumber: 10,
        sharedItems: [{ n: 32, z: false }],
      })
    ).toThrow("unevaluatedProperty: z");

    expect(
      manager.censor<TestEvent4>(
        "urn:acme:other#TestEvent4",
        {
          type: "test_event4",
          name: "test",
        },
        { classification: "anonymous", purposes: "any" }
      )
    ).toBeUndefined();

    expect(() =>
      manager.validate<TestEvent3>("urn:acme:other#TestEvent2", {
        type: "current_name",
        sharedNumber: 32,
        sharedItems: [{ n: 32 }],
      })
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
    ).toEqual<typeof data>({
      testNumber: data.testNumber,
      testArray: [
        {
          anonymousString: "gazonk",
        },
      ],
    });

    expect(() => manager.createVariableSet()).toThrow("already");

    const variables = manager.createVariableSet("urn:tailjs:core");

    expect(
      variables.get({ scope: "session", key: "test" })?.classification
    ).toBe(DataClassification.Indirect);

    expect(variables.get({ scope: "session", key: "404" })).toBeUndefined();

    expect(variables.tryValidate({ scope: "session", key: "test" }, 20)).toBe(
      20
    );

    expect(
      variables.censor({ scope: "session", key: "test" }, 20, {
        classification: "anonymous",
        purposes: "any",
      })
    ).toBeUndefined();

    expect(
      variables.censor({ scope: "session", key: "test" }, 20, {
        classification: "indirect",
        purposes: "any",
      })
    ).toBe(20);

    expect(
      variables.tryValidate({ scope: "session", key: "test" }, "test")
    ).toBeUndefined();

    //expect(manager.validateVariableUniqueness().length).toBe(2);
  });

  it("Handles composition.", () => {
    const manager = new SchemaManager([compositionSchema]);

    expect(
      manager.validate<AtLeast<CompositionTest1>>("urn:tailjs:core#Test1", {
        test2: "hello",
      })
    ).toBeDefined();

    expect(() =>
      manager.validate<AtLeast<CompositionTest1>>("urn:tailjs:core#Test1", {
        test: "not both",
        test2: "hello",
      })
    ).toThrow("exactly one");
  });

  it("Supports polymorphism.", () => {
    expect(() => new SchemaManager([invalidPolymorphicSchema])).toThrow(
      "discriminate"
    );
    const manager = new SchemaManager([polymorphicSchema]);

    expect(
      manager.validate<PolyTest1>("urn:tailjs:core#Test1", {
        reference: { $type: "type1", sub1: "Hello" } as PolyType1,
      })
    ).toBeDefined();

    expect(
      manager.validate<PolyTest1>("urn:tailjs:core#Test1", {
        reference: { $type: "type2", sub2: 32 } as PolyType2,
      })
    ).toBeDefined();

    expect(
      manager.validate<PolyTest1>("urn:tailjs:core#Test1", {
        reference: { $type: "type31", sub2: "32" } as PolyType31,
      })
    ).toBeDefined();

    expect(() =>
      manager.validate<PolyTest1>("urn:tailjs:core#Test1", {
        reference: { $type: "type31", sub2: 32 } as PolyBase,
      })
    ).toThrow("string");

    expect(() =>
      manager.validate<PolyTest1>("urn:tailjs:core#Test1", {
        reference: { $type: "type1", sub2: 32 } as PolyBase,
      })
    ).toThrow("sub2");
  });

  it("Supports event definitions from properties and sub schemas.", () => {
    let schema = new SchemaManager([
      {
        ...schemaHeader,
        $defs: {
          ...systemEvents,
          events: {
            $defs: {
              EventType1: {
                type: "object",
                properties: { test: { type: "string" } },
              },
            },
          },
        },
      },
    ]);
    expect(schema.getType("urn:tailjs:core#EventType1")).toBeDefined();
  });
});
