import { SchemaSystemTypeDefinition } from "@tailjs/types";
import { throwValidationErrors, TypeResolver } from "../src";
import { primitives } from "@tailjs/json-schema";

describe("TypeResolver", () => {
  it("Parses schemas", () => {
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
            Censored: {
              usage: {
                classification: "indirect",
              },
              properties: {
                ok: {
                  usage: { classification: "anonymous" },
                  primitive: "string",
                },
                pers: {
                  primitive: "string",
                },
                perf: {
                  usage: {
                    purposes: { performance: true },
                  },
                  primitive: "string",
                },
                secret: {
                  primitive: "number",
                  usage: {
                    visibility: "trusted-only",
                  },
                },
                nested: {
                  usage: {
                    classification: "anonymous",
                    purposes: { performance: true },
                  },
                  properties: {
                    ok: { primitive: "string" },
                    req: {
                      usage: {
                        classification: "indirect",
                        // Implicitly "performance"
                      },
                      required: false,
                      primitive: "boolean",
                    },
                  },
                },
                nestedReq: {
                  usage: { classification: "anonymous" },
                  properties: {
                    ok: { primitive: "string" },
                    req: {
                      usage: {
                        classification: "indirect",
                        purposes: { performance: true, functionality: true },
                      },
                      required: true,
                      primitive: "boolean",
                    },
                  },
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
                  type: "Test",
                },
                test: {
                  usage: {
                    visibility: "public",
                  },
                  primitive: "string",
                },
              },
            },
          },
        },
      },
    ]);

    const testType = resolver.getType("urn:test#Test");
    expect(resolver.getEventType("test_event")).toBe(testType);

    let validated = throwValidationErrors((errors) =>
      testType.validate(
        {
          type: "test_event",
          test: "ok",
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

    //console.log(validated);

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
            purposes: {},
          },
        }
      )
    ).toEqual({
      ok: "1",
      pers: "2",
      nested: {
        ok: "",
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
      },
      nestedReq: {
        ok: "ok",
        req: true,
      },
    });
  });
});
