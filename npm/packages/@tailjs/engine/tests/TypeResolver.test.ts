import {
  DataPurposes,
  handleValidationErrors,
  JsonSchemaAdapter,
  SCHEMA_TYPE_PROPERTY,
  SchemaSystemTypeDefinition,
  TypeResolver,
} from "@tailjs/types";
import * as fs from "fs";

describe("TypeResolver", () => {
  it("Parses schemas and validates", () => {
    const resolver = new TypeResolver([
      {
        schema: {
          name: "test",
          namespace: "urn:test",

          types: {
            Event: {
              system: "event",
              abstract: true,
              properties: {
                type: {
                  primitive: "string",
                  required: true,
                },
              },
            } as SchemaSystemTypeDefinition,

            UnionTest: {
              properties: {
                test: {
                  union: [
                    { primitive: "string" },
                    { primitive: "number" },
                    { item: { primitive: "string" } },
                    {
                      properties: {
                        requiredTest: {
                          primitive: "string",
                          required: true,
                        },
                        test2: { primitive: "boolean" },
                      },
                    },
                  ],
                },
              },
            },

            TestBase: {
              abstract: true,
              properties: {
                self: {
                  reference: "TestBase",
                },
              },
            },

            Test: {
              extends: ["TestBase"],
              properties: {
                type: {
                  enum: ["test_event"],
                },

                nested: {
                  properties: {
                    hej: {
                      key: {
                        primitive: "number",
                      },
                      value: {
                        item: {
                          primitive: "uuid",
                        },
                      },
                    },
                  },
                },
                date: {
                  primitive: "datetime",
                },
                date2: {
                  primitive: "date",
                  default: "2024-01-02T00:00:00Z",
                },
                test: {
                  visibility: "public",
                  primitive: "string",
                },
              },
            },
            Test2: {
              extends: ["Test"],
              properties: {
                type: {
                  enum: ["test_event"],
                },
                ged: {
                  primitive: "number",
                  required: true,
                },
              },
            },
            Test3: {
              extends: ["Test"],
              properties: {
                type: {
                  enum: ["test_event"],
                },
                geiss: {
                  primitive: "number",
                  required: true,
                },
              },
            },
          },
        },
      },
    ]);

    const testType = resolver.getType("urn:test#TestBase");

    let validated = handleValidationErrors((errors) =>
      testType.validate(
        {
          type: "test_event",
          test: "ok",
          ged: 90,

          nested: {
            hej: {
              80: [
                "564f46b5-339e-4bf3-afb9-1c24b6a050e3",
                "{B30AF4CC-7E31-4016-B8A4-ABB1E4F3BFD8}",
              ],
            },
          },
          date: "2024-01-01Z",
          self: { type: "test_event" },
        },
        null,
        { trusted: false },
        errors
      )
    );

    expect(validated.date).toBe("2024-01-01T00:00:00.000Z");
    expect(validated.nested.hej["80"]).toEqual([
      "564f46b5-339e-4bf3-afb9-1c24b6a050e3",
      "b30af4cc-7e31-4016-b8a4-abb1e4f3bfd8",
    ]);

    expect(
      handleValidationErrors((errors) =>
        testType.validate(
          {
            type: "test_event",
            ged: 90,
          },
          null,
          { trusted: false },
          errors
        )
      )[SCHEMA_TYPE_PROPERTY]
    ).toBe("urn:test#Test2");

    expect(
      handleValidationErrors((errors) =>
        testType.validate(
          {
            type: "test_event",
            geiss: 30,
          },
          null,
          { trusted: false },
          errors
        )
      )[SCHEMA_TYPE_PROPERTY]
    ).toBe("urn:test#Test3");

    expect(
      handleValidationErrors((errors) =>
        testType.validate(
          {
            type: "test_event",
          },
          null,
          { trusted: false },
          errors
        )
      )[SCHEMA_TYPE_PROPERTY]
    ).toBe("urn:test#Test");

    expect(() =>
      handleValidationErrors((errors) =>
        testType.validate(
          {
            type: "test_event",
            ged: 40,
            geiss: 30,
          },
          null,
          { trusted: false },
          errors
        )
      )
    ).toThrow(/geiss:.*not defined/);

    const unionType = resolver.getType("urn:test#UnionTest", true);
    unionType.validate(
      {
        test: null,
      },
      null,
      { trusted: true }
    );

    unionType.validate(
      {
        test: 80,
      },
      null,
      { trusted: true }
    );

    expect(() =>
      unionType.validate(
        {
          test: ["a", 3],
        },
        null,
        { trusted: true }
      )
    ).toThrow("3 is not a string."); // Specific error from array type.

    unionType.validate(
      {
        test: {
          requiredTest: "ok",
        },
      },
      null,
      { trusted: true }
    );

    expect(() =>
      unionType.validate(
        {
          test: {
            test2: 90,
          },
        },
        null,
        { trusted: true }
      )
    ).toThrow(/requiredTest.*required.*90.*Boolean/gs);

    // unionType.validate(
    //   {
    //     test: {
    //       test: "ok",
    //     },
    //   },
    //   null,
    //   { trusted: true }
    // );

    expect(() =>
      unionType.validate(
        {
          test: false,
        },
        null,
        { trusted: true }
      )
    ).toThrow("any of the allowed");

    // expect(()=> testType.validate(
    //   {
    //     intersection: false,
    //   },
    //   null,
    //   { trusted: true }
    // ))
  });

  it("Censors", () => {
    const resolver = new TypeResolver([
      {
        schema: {
          name: "test",
          namespace: "urn:test",

          types: {
            Censored: {
              classification: "indirect",
              abstract: true,
              properties: {
                ok: {
                  classification: "anonymous",
                  primitive: "string",
                },
                pers: {
                  primitive: "string",
                },
                perf: {
                  purposes: { performance: true },

                  primitive: "string",
                },
                secret: {
                  primitive: "number",
                  visibility: "trusted-only",
                },
                nested: {
                  classification: "anonymous",
                  purposes: { performance: true },

                  properties: {
                    ok: { primitive: "string" },
                    req: {
                      classification: "indirect",
                      // Implicitly "performance" inherited from type
                      required: false,
                      primitive: "boolean",
                    },
                  },
                },
                nestedReq: {
                  classification: "anonymous",
                  properties: {
                    ok: { primitive: "string" },
                    req: {
                      classification: "indirect",
                      purposes: { performance: true, functionality: true },
                      required: true,
                      primitive: "boolean",
                    },
                  },
                },
                self: {
                  reference: "Censored",
                },
              },
            },
            SubCensored: {
              extends: ["Censored"],
              properties: {
                ok: { reference: "base" },
                hello: {
                  classification: "anonymous",
                  primitive: "string",
                  required: true,
                },
              },
            },
            SubCensored2: {
              extends: ["Censored"],
              properties: {
                boom: {
                  primitive: "boolean",
                  required: true,
                },
                hello: {
                  primitive: "string",
                },
              },
            },
            SubCensored2_1: {
              extends: ["SubCensored2"],
              // "anonymous" should take effect on all own properties instead of base types "indirect".
              classification: "anonymous",
              properties: {
                boom: {
                  reference: "base",
                  // Override the classification of the base property (seemingly weird thing to do, but why not?)
                  classification: "anonymous",
                },
                test21: {
                  required: true,
                  primitive: "number",
                },
              },
            },
            RecordTest: {
              properties: {
                fields: {
                  key: { primitive: "string" },
                  value: { primitive: "string" },
                },
              },
            },
          },
        },
      },
    ]);

    const recordType = resolver.getType("urn:test#RecordTest");
    expect(
      recordType.censor(
        { fields: { test: "test" } },
        { consent: { classification: "direct", purposes: DataPurposes.all } }
      )
    ).toEqual({ fields: { test: "test" } });
    const censorType = resolver.getType("urn:test#Censored");

    expect(
      censorType.censor(
        {
          ok: "1",
          pers: "2",
          perf: "3",
          secret: 1337,
          nested: {
            ok: "",
            req: false,
          },
          nestedReq: {
            ok: "ok",
            req: true,
          },
        },
        {
          trusted: false,
          consent: {
            classification: "anonymous",
            purposes: {},
          },
        }
      )
    ).toEqual({
      ok: "1",
      nested: {
        ok: "",
        req: false,
      },
      "@privacy": {
        censored: true,
      },
    });

    // Polymorphic censoring. Subtype 1 has anonymous hello.
    expect(
      censorType.censor(
        {
          boom: true,
          hello: "ok",
          ok: "Anonymous, but boom is required, so censored.",
        },
        {
          trusted: false,
          consent: {
            classification: "anonymous",
            purposes: {},
          },
        }
      )
    ).toBeUndefined();

    expect(
      censorType.censor(
        {
          boom: true,
          hello: "ok",
          ok: "Anonymous, but boom is required, so censored.",
        },
        {
          trusted: false,
          consent: {
            classification: "anonymous",
            purposes: {},
          },
          forResponse: true,
        }
      )
    ).toEqual({
      ok: "Anonymous, but boom is required, so censored.",
      "@privacy": {
        censored: true,
        invalid: true,
      },
    });

    // Polymorphic censoring. Subtype 2 (boom required) has indirect hello
    expect(
      censorType.censor(
        {
          hello: "ok",
          boom: true,
          test21: 10,
          ok: "Anonymous can be here.",
          pers: "Censored",
        },
        {
          trusted: false,
          consent: {
            classification: "anonymous",
            purposes: {},
          },
        }
      )
    ).toEqual({
      boom: true,
      test21: 10,
      ok: "Anonymous can be here.",
      "@privacy": {
        censored: true,
      },
    });

    // Polymorphic censoring. Subtype 2.1 (boom required, but now anonymous) allows the data.
    expect(
      censorType.censor(
        {
          hello: "ok",
        },
        {
          trusted: false,
          consent: {
            classification: "anonymous",
            purposes: {},
          },
        }
      )
    ).toEqual({
      hello: "ok",
    });

    expect(
      censorType.censor(
        {
          ok: "1",
          pers: "2",
          perf: "3",
          secret: 1337,
          nested: {
            ok: "",
            req: false,
          },
          nestedReq: {
            ok: "ok",
            req: true,
          },
        },
        {
          trusted: false,
          consent: {
            classification: "indirect",
            purposes: {},
          },
        }
      )
    ).toEqual({
      ok: "1",
      pers: "2",
      nested: {
        ok: "",
        req: false,
      },
      "@privacy": {
        censored: true,
      },
    });

    expect(
      censorType.censor(
        {
          ok: "1",
          pers: "2",
          perf: "3",
          secret: 1337,
          nested: {
            ok: "",
            req: false,
          },
          nestedReq: {
            ok: "ok",
            req: true,
          },
        },
        {
          trusted: false,
          consent: {
            classification: "indirect",
            purposes: { performance: true },
          },
        }
      )
    ).toEqual({
      ok: "1",
      pers: "2",
      perf: "3",
      nested: {
        ok: "",
        req: false,
      },
      nestedReq: {
        ok: "ok",
        req: true,
      },
      "@privacy": {
        censored: true,
      },
    });

    expect(
      censorType.censor(
        {
          ok: "1",
          pers: "2",
          perf: "3",
          secret: 1337,
          nested: {
            ok: "",
            req: false,
          },
          nestedReq: {
            ok: "ok",
            req: true,
          },
        },
        {
          trusted: true,
          consent: {
            classification: "indirect",
            purposes: { functionality: true },
          },
        }
      )
    ).toEqual({
      ok: "1",
      pers: "2",
      secret: 1337,
      nested: {
        ok: "",
        req: false,
      },
      nestedReq: {
        ok: "ok",
        req: true,
      },
      "@privacy": {
        censored: true,
      },
    });
  });

  it("Supports JSON schema", () => {
    const tailJsSchema = fs.readFileSync("c:/temp/tailjs-schema.json", "utf-8");
    const adapter = new JsonSchemaAdapter();
    const parsed = adapter.parse(tailJsSchema);
    const systemEvent = parsed.find(
      (definition) => definition.namespace === "urn:tailjs:core"
    )?.types?.TrackedEvent;
    if (!systemEvent) {
      fail("The system event type is missing (urn:tailjs:core#TrackedEvent).");
    }
    (systemEvent as SchemaSystemTypeDefinition).system = "event";

    fs.writeFileSync(
      "c:/temp/tailjs-schema-parsed.json",
      JSON.stringify(parsed, null, 2),
      "utf-8"
    );

    const resolver = new TypeResolver(
      parsed.map((schema) => ({
        schema,
      }))
    );

    const testEvent = {
      type: "component_view",
      components: [{ id: "ok" }],
      session: {
        sessionId: "97f32a42-8e40-4fa0-9404-06d19aeac587",
        clientIp: "123",
      },
    };

    const componentEvent = resolver.getEventType(testEvent);
    let validated = componentEvent.validate({ ...testEvent }, null, {
      trusted: true,
    });
    let censored = componentEvent.censor(validated, { trusted: true });
    expect(censored?.session.clientIp).toBe("123");

    censored = componentEvent.censor(validated, {
      consent: { classification: "anonymous", purposes: {} },
      trusted: true,
    });
    expect(censored?.session.clientIp).toBeUndefined();

    const sessionReference = resolver.getVariable(
      "session",
      "@session_reference"
    );

    expect(sessionReference.validate("1234", undefined, {})).toBe("1234");

    fs.writeFileSync(
      "c:/temp/tailjs-schema-re-serialized.json",
      JSON.stringify(JSON.parse(adapter.serialize(resolver.schemas)), null, 2),
      "utf-8"
    );
  });

  it("Supports patches", () => {
    const resolver = new TypeResolver([
      {
        schema: {
          namespace: "urn:test",
          types: {
            Event: {
              system: "event",
              abstract: true,
              properties: {
                type: {
                  primitive: "string",
                  required: true,
                },
              },
            } as SchemaSystemTypeDefinition,

            TestEvent: {
              event: true,
              properties: {
                type: {
                  primitive: "string",
                  enum: ["test_event"],
                },
                name: {
                  primitive: "string",
                  required: true,
                },
                nested: {
                  key: { primitive: "string" },
                  value: {
                    reference: "NestedValue",
                  },
                },
              },
            },
            NestedValue: {
              properties: {
                active: {
                  primitive: "boolean",
                  required: true,
                },
              },
            },
          },
        },
      },
    ]);
    const testEventType = resolver.getEventType({ type: "test_event" });
    const testEventPatchType = resolver.getEventType({
      type: "test_event_patch",
    });
    expect(testEventType && testEventPatchType).not.toBeUndefined();

    expect(() =>
      testEventType.validate({ type: "test_event" }, null, { trusted: true })
    ).toThrow("required");

    expect(() =>
      testEventType.validate(
        { type: "test_event", name: "test", nested: { test: {} } },
        null,
        { trusted: true }
      )
    ).toThrow("nested.test.active");

    expect(() =>
      testEventPatchType.validate(
        { type: "test_event_patch", nested: { test: {} } },
        null,
        {
          trusted: true,
        }
      )
    ).not.toThrow();
  });
});
