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
export const polymorphicSchema = clone(invalidPolymorphicSchema);
polymorphicSchema.$defs.SubType1.properties.$type = { const: "type1" };
polymorphicSchema.$defs.SubType2.properties.$type = { const: "type2" };
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
        session: {
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
                    description: "Used to validate that the base event's `type` property gets ignored during censored.",
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
//# sourceMappingURL=test-schemas.js.map