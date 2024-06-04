import { SCOPE_INFO_KEY } from "@constants";

import { EntityMetadata, SchemaManager } from "@tailjs/json-schema";
import { DataClassification, DataPurposeFlags } from "@tailjs/types";
import * as fs from "fs";
import {
  CompositionTest1,
  PolyTest1,
  PolyType1,
  PolyType2,
  PolyType3,
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
  const stripMetadata = <T>(value: T): T => (
    value && delete value[EntityMetadata.TypeId], value
  );

  it("Validates and censors", () => {
    const manager = SchemaManager.create([bigSchema]);

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

    expect(stripMetadata(manager.validate("urn:tailjs:core#Type1", data))).toBe(
      data
    );

    expect(() =>
      stripMetadata(
        manager.validate<TestEvent3>("urn:acme:other#TestEvent3", {
          type: "current_name",
          sharedNumber: 32,
          sharedItems: [{ n: 32 }],
        })
      )
    ).not.toThrow();

    expect(() =>
      stripMetadata(
        manager.validate<Partial<TestEvent3>>("urn:acme:other#TestEvent3", {
          type: "current_name",
          sharedItems: [{ n: 32 }],
        })
      )
    ).toThrow("sharedNumber");

    // Test partial patch types.
    expect(() =>
      stripMetadata(
        manager.validate<Partial<TestEvent3>>("current_name", {
          type: "current_name",
        })
      )
    ).toThrow("sharedNumber");

    expect(
      stripMetadata(
        manager.validate<Partial<TestEvent3>>("current_name_patch", {
          type: "current_name_patch" as any,
          patchTargetId: "ok",
        })
      )
    ).toBeDefined();

    expect(() =>
      stripMetadata(
        manager.validate<AtLeast<TestEvent3>>("urn:acme:other#TestEvent3", {
          type: "current_name",
          sharedNumber: 10,
          sharedItems: [{ n: 32, z: false }],
        })
      )
    ).toThrow("unevaluatedProperty: z");

    expect(
      stripMetadata(
        manager.patch<TestEvent4>(
          "urn:acme:other#TestEvent4",
          {
            type: "test_event4",
            name: "test",
          },
          { classification: "anonymous", purposes: "any" }
        )
      )
    ).toBeUndefined();

    expect(() =>
      stripMetadata(
        manager.validate<TestEvent3>("urn:acme:other#TestEvent2", {
          type: "current_name",
          sharedNumber: 32,
          sharedItems: [{ n: 32 }],
        })
      )
    ).toThrow("abstract");

    expect(
      stripMetadata(
        manager.patch("urn:tailjs:core#Type1", data, {
          classification: DataClassification.Sensitive,
          purposes: DataPurposeFlags.Any,
        })
      )
    ).toEqual(data);

    expect(
      stripMetadata(
        manager.patch("urn:tailjs:core#Type1", data, {
          classification: DataClassification.Anonymous,
          purposes: DataPurposeFlags.Any,
        })
      )
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
      stripMetadata(
        variables.patch({ scope: "session", key: "test" }, 20, {
          classification: "anonymous",
          purposes: "any",
        })
      )
    ).toBeUndefined();

    expect(
      stripMetadata(
        variables.patch({ scope: "session", key: "test" }, 20, {
          classification: "indirect",
          purposes: "any",
        })
      )
    ).toBe(20);

    expect(
      variables.tryValidate({ scope: "session", key: "test" }, "test")
    ).toBeUndefined();

    expect(
      variables.patch(
        { scope: "session", key: "serverOnly" },
        { alsoClient: "foo", onlyServer: "bar" },
        { classification: "anonymous", purposes: "any" }
      )
    ).toEqual({ alsoClient: "foo" });

    expect(
      stripMetadata(
        variables.patch(
          { scope: "session", key: "serverOnly" },
          { alsoClient: "foo", onlyServer: "bar" },
          { classification: "anonymous", purposes: ["any", "server"] }
        )
      )
    ).toEqual({ alsoClient: "foo", onlyServer: "bar" });

    for (const key of ["clientReadOnly", "clientReadOnly2"]) {
      stripMetadata(
        expect(
          variables.patch(
            { scope: "session", key },
            { test: "123" },
            { classification: "anonymous", purposes: "any" },
            true,
            false
          )
        )
      ).toBeDefined();

      expect(
        stripMetadata(
          variables.patch(
            { scope: "session", key },
            { test: "123" },
            { classification: "anonymous", purposes: "any" },
            true,
            true
          )
        )
      ).toBeUndefined();

      expect(
        stripMetadata(
          variables.patch(
            { scope: "session", key },
            { test: "123" },
            { classification: "anonymous", purposes: ["any", "server"] },
            true,
            true
          )
        )
      ).toBeDefined();
    }

    //expect(manager.validateVariableUniqueness().length).toBe(2);
  });

  it("Handles composition", () => {
    const manager = SchemaManager.create([compositionSchema]);

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

  it("Supports polymorphism", () => {
    const manager = SchemaManager.create([polymorphicSchema]);

    var def = manager.schema.definition;
    var testType = def.$defs["urn:tailjs:core"].$defs.Test1;
    expect(testType.properties.reference.unevaluatedProperties).toBe(false);
    expect(testType.properties.reference2.unevaluatedProperties).toBe(false);
    expect(testType.properties.reference3.unevaluatedProperties).toBe(false);
    expect(testType.properties.reference4.unevaluatedProperties).toBe(false);

    expect(
      manager.getType("urn:tailjs:core#Test1").properties?.get("reference")
        ?.polymorphic
    ).toBe(true);

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
        reference: { $type: "type31", sub2: 32 as any },
      })
    ).toThrow("string");

    expect(() =>
      manager.validate<PolyTest1>("urn:tailjs:core#Test1", {
        reference3: { $type: "whatever", sub2: "hello" },
      })
    ).toBeDefined();

    expect(() =>
      manager.validate<PolyTest1>("urn:tailjs:core#Test1", {
        reference4: {
          $type: "gazonk",
          sub2: "fred",
          anonymous: "not a number" as any,
        },
      })
    ).toThrow("anonymous");

    expect(() =>
      manager.validate<PolyType3>("urn:tailjs:core#Subtype3", {
        $type: "thud",
        //sub2: "fred",
      } as any)
    ).toThrow("sub2");

    expect(() =>
      manager.validate<PolyTest1>("urn:tailjs:core#Test1", {
        reference4: { $type: "waldo", sub2: "fred", anonymous: 53 },
      })
    ).toBeDefined();

    expect(() =>
      manager.validate<PolyTest1>("urn:tailjs:core#Test1", {
        reference4: {
          $type: "type31",
          sub2: "fred",
          anonymous: 53,
        } as PolyType31,
      })
    ).toBeDefined();
  });

  it("Supports event definitions from naming convention", () => {
    let schema = SchemaManager.create([
      {
        ...schemaHeader,
        $defs: {
          ...systemEvents,
          events: {
            $defs: {
              Test1Event: {
                type: "object",
                properties: { test: { type: "string" } },
              },
              AnotherTestEvent: {
                type: "object",
                properties: { test: { type: "string" } },
              },
            },
          },
          Test3Event: {
            type: "object",
            properties: { number3: { type: "number" } },
          },
          Test4Event: {
            type: "object",
            properties: { type: { const: "ev4" }, number3: { type: "number" } },
          },
          "urn:acme:other": {
            $schema: "https://json-schema.org/draft/2020-12/schema",
            $id: "urn:acme:other",
            "x-privacy-purposes": "functionality",
            $defs: {
              Test2Event: {
                type: "object",
                properties: { test: { type: "string" } },
              },
            },
          },
        },
      },
    ]);
    expect(schema.getType("urn:tailjs:core#Test1Event")).toBeDefined();
    expect(schema.getType("urn:tailjs:core#AnotherTestEvent")).toBeDefined();
    expect(schema.getType("urn:acme:other#Test2Event")).toBeDefined();
    expect(schema.getType("urn:tailjs:core#Test3Event")).toBeDefined();
    expect(schema.getType("urn:tailjs:core#Test4Event")).toBeDefined();
    expect(schema.getType("test_1")).toBeDefined();
    expect(schema.getType("test_2")).toBeDefined();
    expect(schema.getType("test_3")).toBeDefined();
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
    const manager = SchemaManager.create([schema]);

    // const clickIntent = manager.getType("component_click_intent");
    // expect(clickIntent).toBeDefined();

    manager.validate("view_patch", {
      duration: {
        totalTime: 19048,
        visibleTime: 19048,
        interactiveTime: 13085,
        activations: 0,
      },
      type: "view_patch",
      patchTargetId: "lw8ajrz7tc_3",
      clientId: "lw8ajrz7tc_7",
      timestamp: 0,
      view: "lw8ajrz7tc_3",
    });

    const variables = manager.compileVariableSet("urn:tailjs:core");

    expect(
      variables.patch(
        { scope: "session", key: SCOPE_INFO_KEY },
        {
          id: "test",
          firstSeen: 1337,
          lastSeen: 1338,
          views: 0,
        },
        { level: "anonymous", purposes: "necessary" }
      )!.id
    ).toBeUndefined();

    expect(
      variables.patch(
        { scope: "session", key: SCOPE_INFO_KEY },
        {
          id: "test",
          firstSeen: 1337,
          lastSeen: 1338,
          views: 0,
        },
        { level: "anonymous", purposes: ["any", "server"] }
      )!.id
    ).toBe("test");

    const locationType = {
      type: "session_location",
    };

    const country = {
      ...locationType,
      country: {
        name: "test country",
      },
    };

    const city = {
      ...locationType,
      city: {
        name: "test city",
      },
    };
    const locationEvent = {
      ...country,
      ...city,
    };

    expect(
      stripMetadata(
        manager.patch("session_location", locationEvent, {
          level: "anonymous",
          purposes: "necessary",
        })
      )
    ).toEqual({ ...country });

    expect(
      stripMetadata(
        manager.patch("session_location", locationEvent, {
          level: "indirect",
          purposes: "necessary",
        })
      )
    ).toEqual({ ...country });

    expect(
      stripMetadata(
        manager.patch("session_location", locationEvent, {
          level: "indirect",
          purposes: "performance",
        })
      )
    ).toEqual(locationEvent);

    // fs.writeFileSync(
    //   "c:/temp/tailjs.json",
    //   JSON.stringify(manager.schema.definition, null, 2),
    //   "utf-8"
    // );
  });
});
