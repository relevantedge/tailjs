import { DataClassification, DataPurposeFlags } from "@tailjs/types";
import * as fs from "fs";
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
        purposes: DataPurposeFlags.Any,
      })
    ).toEqual(data);

    expect(
      manager.censor("urn:tailjs:core#Type1", data, {
        classification: DataClassification.Anonymous,
        purposes: DataPurposeFlags.Any,
      })
    ).toEqual<typeof data>({
      testNumber: data.testNumber,
      testArray: [
        {
          anonymousString: "gazonk",
        },
      ],
    });

    expect(() => manager.compileVariableSet()).toThrow("already");

    const variables = manager.compileVariableSet("urn:tailjs:core");

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

    expect(
      variables.censor(
        { scope: "session", key: "serverOnly" },
        { alsoClient: "foo", onlyServer: "bar" },
        { classification: "anonymous", purposes: "any" }
      )
    ).toEqual({ alsoClient: "foo" });

    expect(
      variables.censor(
        { scope: "session", key: "serverOnly" },
        { alsoClient: "foo", onlyServer: "bar" },
        { classification: "anonymous", purposes: ["any", "server"] }
      )
    ).toEqual({ alsoClient: "foo", onlyServer: "bar" });

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
    // Discriminator no longer required.
    // expect(() => new SchemaManager([invalidPolymorphicSchema])).toThrow(
    //   "discriminate"
    // );
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
              AnotherTestEvent: {
                type: "object",
                properties: { test: { type: "string" } },
              },
            },
          },
          EventType3: {
            type: "object",
            properties: { number3: { type: "number" } },
          },
          EventType4: {
            type: "object",
            properties: { type: { const: "ev4" }, number3: { type: "number" } },
          },
          Event: {
            anyOf: [
              { $ref: "#/$defs/EventType3" },
              { $ref: "#/$defs/EventType4" },
            ],
          },
          "urn:acme:other": {
            $schema: "https://json-schema.org/draft/2020-12/schema",
            $id: "urn:acme:other",
            "x-privacy-purposes": "functionality",
            $defs: {
              Events: {
                type: "object",
                properties: {
                  EventType2: {
                    type: "object",
                    properties: { test: { type: "string" } },
                  },
                },
              },
            },
          },
        },
      },
    ]);
    expect(schema.getType("urn:tailjs:core#EventType1")).toBeDefined();
    expect(schema.getType("urn:tailjs:core#AnotherTestEvent")).toBeDefined();
    expect(schema.getType("urn:acme:other#EventType2")).toBeDefined();
    expect(schema.getType("urn:tailjs:core#EventType3")).toBeDefined();
    expect(schema.getType("urn:tailjs:core#EventType4")).toBeDefined();
    expect(schema.getType("event_type_1")).toBeDefined();
    expect(schema.getType("event_type_2")).toBeDefined();
    expect(schema.getType("event_type_3")).toBeDefined();
    expect(schema.getType("ev4")).toBeDefined();
    expect(schema.getType("another_test")).toBeDefined();
  });

  it("Parses the real schema", () => {
    const fullSchemaPath = "packages/@tailjs/types/dist/schema/dist/index.json";
    if (!fs.existsSync(fullSchemaPath)) {
      console.error(
        `${fullSchemaPath} does not exist. Please build @tailjs/schema before running this test.`
      );
      return;
    }

    const schema = JSON.parse(fs.readFileSync(fullSchemaPath, "utf-8"));
    const manager = new SchemaManager([schema]);

    const clickIntent = manager.getType("component_click_intent");
    expect(clickIntent).toBeDefined();

    console.log(
      clickIntent.validate({
        type: "component_click_intent",
        pos: { x: 32, y: 80 },
      })
    );

    fs.writeFileSync(
      "c:/temp/tailjs.json",
      JSON.stringify(manager.schema.definition, null, 2),
      "utf-8"
    );
  });
});
