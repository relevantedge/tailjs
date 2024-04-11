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
  sub2?: string;
  sub3?: string;
}

export interface PolyType31 extends PolyBase {
  $type: "type31";
}

export interface PolyTest1 {
  reference?: PolyBase;
}

export const invalidPolymorphicSchema = {
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
    SubType1: {
      $ref: "urn:tailjs:core#/$defs/BaseType",
      properties: {
        sub1: { type: "string" },
      },
    },
    SubType2: {
      type: "object",
      allOf: [{ $ref: "urn:tailjs:core#/$defs/BaseType" }],
      properties: {
        sub2: { type: "number" },
      },
    },
    SubType3: {
      type: "object",
      $ref: "urn:tailjs:core#/$defs/BaseType",
      properties: {
        sub2: { type: "string" },
      },
    },
    SubType31: {
      type: "object",
      $ref: "urn:tailjs:core#/$defs/SubType3",
      properties: {
        $type: { const: "type31" },
      },
    },
    Test1: {
      type: "object",
      properties: {
        reference: { $ref: "#/$defs/BaseType" },
      },
    },
  },
};

export const polymorphicSchema = clone(invalidPolymorphicSchema) as any;
polymorphicSchema.$defs.SubType1.properties.$type = { const: "type1" };
polymorphicSchema.$defs.SubType2.properties.$type = { const: "type2" };

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
      },
    },
    DeviceVariables: {
      type: "object",
      properties: {
        deviceTest: { type: "string" },
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
