import { clone } from "@tailjs/util";

export const schemaHeader = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "urn:tailjs:core",
  "x-privacy-class": "anonymous",
  "x-privacy-purposes": "necessary",
};

export const systemEvents = {
  TrackedEvent: {
    $id: "urn:tailjs:core:event",
    type: "object",
    properties: {
      type: {
        "x-privacy-censor": "ignore",
        type: "string",
      },
    },
    required: ["type"],
  },
};

export type CompositionTest1 = {
  test?: string;
  test2?: string;
  test3?: number;
};

export const compositionSchema = {
  ...schemaHeader,
  $defs: {
    Test1: {
      oneOf: [
        {
          type: "object",
          properties: {
            test: { type: "string" },
            test3: { type: "number" },
          },
          required: ["test"],
        },
        {
          type: "object",
          properties: {
            test2: { type: "string" },
          },
        },
      ],
    },
  },
};

export interface PolyBase {
  $type: string;
  baseProperty?: string;
}
export interface PolyType1 extends PolyBase {
  $type: "type1";
  sub1?: string;
}

export interface PolyType2 extends PolyBase {
  $type: "type2";
  sub2?: number;
}

export interface PolyType3 extends PolyBase {
  sub2: string;
  sub3?: string;
}

export interface PolyType31 extends PolyType3 {
  $type: "type31";
}

export interface PolyTest1 {
  reference?: PolyType1 | PolyType2 | PolyType31;
  reference2?: PolyBase | PolyType1 | PolyType2 | PolyType31;
  reference3?: PolyType3;
  reference4?: PolyType3 & { anonymous?: number };
}

export const polymorphicSchema = {
  ...schemaHeader,
  $defs: {
    BaseType: {
      type: "object",
      properties: {
        $type: { type: "string" },
        baseProperty: {
          type: "string",
        },
      },
      required: ["$type"],
    },
    Subtype1: {
      $ref: "urn:tailjs:core#/$defs/BaseType",
      properties: {
        $type: { type: "string", const: "type1" },
        sub1: { type: "string" },
      },
    },
    Subtype2: {
      type: "object",
      allOf: [{ $ref: "urn:tailjs:core#/$defs/BaseType" }],
      properties: {
        $type: { type: "string", const: "type2" },
        sub2: { type: "number" },
      },
    },
    Subtype3: {
      type: "object",
      $ref: "urn:tailjs:core#/$defs/BaseType",
      properties: {
        sub2: { type: "string" },
      },
      required: ["sub2"],
    },
    Subtype31: {
      type: "object",
      $ref: "urn:tailjs:core#/$defs/Subtype3",
      properties: {
        $type: { const: "type31" },
      },
    },
    Test1: {
      type: "object",
      properties: {
        reference: {
          oneOf: [
            { $ref: "#/$defs/Subtype1" },
            { $ref: "#/$defs/Subtype2" },
            { $ref: "#/$defs/Subtype31" },
          ],
        },
        // Test that unevaluatedProperties are set correctly.
        reference2: {
          oneOf: [
            { $ref: "#/$defs/BaseType" },
            { $ref: "#/$defs/Subtype1" },
            { $ref: "#/$defs/Subtype2" },
            { $ref: "#/$defs/Subtype31" },
          ],
        },
        reference3: {
          $ref: "urn:tailjs:core#/$defs/Subtype3",
        },
        reference4: {
          $ref: "urn:tailjs:core#/$defs/Subtype3",
          type: "object",
          properties: {
            anonymous: { type: "number" },
          },
        },
      },
    },
  },
};

export type TestEventBase = {
  type: string;
};

export type TestType1 = {
  testNumber: number;
  testNumber2?: number;
  testReference?: TestType2;
  testArray?: TestType3[];
};

export type TestType2 = {
  nestedNumber?: number;
  nestedReference?: TestType1;
};

export type TestType3 = {
  testDate?: string;
  anonymousString?: string;

  testMap?: Record<string, string>;
};

export type TestEvent1 = TestEventBase & {
  type: "test_event_1";
};

export type TestEvent2 = TestEventBase & {
  sharedNumber: number;
  sharedItems?: { n?: number }[];
};

export type TestEvent3 = TestEvent2 & {
  type: "current_name";
};

export type TestEvent4 = TestEventBase & {
  type: "test_event4";
  name: string;
};

export const variablesSchema = {
  ...schemaHeader,
  $id: "urn:variables:default",
  $defs: {
    SessionVariables: {
      type: "object",
      properties: {
        test: { type: "string" },

        censored: {
          "x-privacy-class": "direct",
          type: "string",
        },
      },
    },
    DeviceVariables: {
      type: "object",
      properties: {
        deviceTest: { type: "string" },
        censored: {
          type: "object",
          properties: {
            value1: { type: "number" },
            value2: { "x-privacy-purpose": "functionality", type: "number" },
          },
        },
      },
    },
  },
};

export const prefixedVariableSchema = {
  ...schemaHeader,
  $id: "urn:variables:prefixed",
  $defs: {
    SessionVariables: {
      type: "object",
      properties: {
        prefixed: { type: "string" },
      },
    },
  },
};

export const bigSchema = {
  ...schemaHeader,
  $defs: {
    ...systemEvents,
    TestEvent1: {
      allOf: [
        {
          $ref: "urn:tailjs:core:event",
        },
        {
          type: "object",
          properties: {
            type: {
              const: "test_event_1",
            },
          },
        },
      ],

      //rel: "testing",
    },

    Type1: {
      type: "object",

      properties: {
        testNumber: {
          "x-privacy-class": "anonymous",
          type: "number",
        },
        testNumber2: {
          description: "   @privacy direct",
          type: "number",
        },
        testReference: {
          "x-privacy-class": "indirect",
          $ref: "urn:acme:other#/$defs/Type2",
        },
        // hello: {
        //   $ref: "https://www.lasse.com#/$defs/hello",
        // },
        testArray: {
          type: "array",
          items: {
            $ref: "#/$defs/Type3",
          },
        },
      },
      required: ["testNumber"],
    },
    Type3: {
      type: "object",
      "x-privacy-class": "sensitive",

      properties: {
        testDate: {
          type: "string",
          format: "date-time",
        },
        anonymousString: {
          "x-privacy-class": "anonymous",
          type: "string",
        },

        testMap: {
          type: "object",

          additionalProperties: {
            type: "string",
          },
        },
      },
    },
    SessionVariables: {
      type: "object",
      properties: {
        test: {
          "x-privacy-class": "indirect",
          type: "number",
        },
        test2: {
          type: "string",
        },
        serverOnly: {
          type: "object",
          properties: {
            alsoClient: { type: "string" },
            onlyServer: {
              "x-privacy-purposes": ["any", "server"],
              type: "string",
            },
          },
        },
      },
    },

    "urn:acme:other": {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "urn:acme:other",
      "x-privacy-purposes": "functionality",

      $defs: {
        TestEvent2: {
          allOf: [
            {
              type: "object",
              $ref: "urn:tailjs:core:event",
            },
          ],
          type: "object",
          properties: {
            sharedNumber: {
              type: "number",
            },
            sharedItems: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  n: {
                    type: "number",
                  },
                },
              },
            },
          },
          required: ["sharedNumber"],
        },
        TestEvent3: {
          allOf: [
            {
              $ref: "urn:acme:other#/$defs/TestEvent2",
            },
          ],
          type: "object",
          properties: {
            type: { type: "string", enum: ["current_name", "old_name"] },
          },
        },
        TestEvent4: {
          description:
            "Used to validate that the base event's `type` property gets ignored during censored.",

          allOf: [
            {
              $ref: "urn:tailjs:core:event",
            },
          ],

          properties: {
            type: { const: "test_event4" },
            name: {
              "x-privacy-class": "direct",
              type: "string",
            },
          },
        },
        Type2: {
          "x-privacy-class": "indirect",
          type: "object",
          properties: {
            nestedNumber: {
              "x-privacy-class": "anonymous",
              type: "number",
            },
            nestedReference: {
              "x-privacy-class": "direct",
              $ref: "urn:tailjs:core#/$defs/Type1",
            },
          },
        },
        SessionVariables: {
          type: "object",
          properties: {
            test: {
              "x-privacy-class": "indirect",
              type: "number",
            },
          },
        },
      },
    },
  },
};
