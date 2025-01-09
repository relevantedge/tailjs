import {
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
        definition: {
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

            Test: {
              event: true,
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
                self: {
                  reference: "Test",
                },
                test: {
                  visibility: "public",
                  primitive: "string",
                },
              },
            },
            Test2: {
              extends: [{ reference: "Test" }],
              event: true,
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
              extends: [{ reference: "Test" }],
              event: true,
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

    console.log(resolver.getType("urn:test#Test")?.id);
    const testType = resolver.getType("urn:test#Test");

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
      )[SCHEMA_TYPE_PROPERTY]?.[0]
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
      )[SCHEMA_TYPE_PROPERTY]?.[0]
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
      )[SCHEMA_TYPE_PROPERTY]?.[0]
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
        definition: {
          name: "test",
          namespace: "urn:test",

          types: {
            Censored: {
              classification: "indirect",
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
              },
            },
            SubCensored: {
              extends: [{ reference: "Censored" }],
              properties: {
                hello: {
                  classification: "anonymous",
                  primitive: "string",
                  required: true,
                },
              },
            },
            SubCensored2: {
              extends: [{ reference: "Censored" }],
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
              extends: [{ reference: "SubCensored2" }],
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
          },
        },
      },
    ]);

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
      parsed.map((definition) => ({
        definition,
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
});
