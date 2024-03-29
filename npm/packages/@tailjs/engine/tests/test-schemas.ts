export type TestEventBase = {
  type: string;
};

export type TestType1 = {
  testNumber: number;
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

export const testSchema1 = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "urn:tailjs:core",
  "x-privacy-class": "anonymous",
  "x-privacy-purposes": "necessary",

  $defs: {
    TrackedEvent: {
      $anchor: "event",
      type: "object",
      properties: {
        type: {
          "x-privacy-ignore": true,
          type: "string",
        },
      },
      required: ["type"],
    },

    TestEvent1: {
      allOf: [
        {
          $ref: "urn:tailjs:core#event",
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
    session: {
      type: "object",
      properties: {
        test: {
          "x-privacy-class": "indirect",
          type: "number",
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
              $ref: "urn:tailjs:core#event",
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
        session: {
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
