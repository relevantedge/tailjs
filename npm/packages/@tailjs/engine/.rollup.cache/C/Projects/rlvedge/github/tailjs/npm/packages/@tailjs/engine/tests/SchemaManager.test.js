import { SchemaManager } from "../src";
import { bigSchema, compositionSchema, invalidPolymorphicSchema, polymorphicSchema, schemaHeader, systemEvents, } from "./test-schemas";
describe("SchemaManager.", () => {
    it("Validates and censors", () => {
        const manager = new SchemaManager([bigSchema]);
        const data = {
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
        expect(() => manager.validate("urn:acme:other#TestEvent3", {
            type: "current_name",
            sharedNumber: 32,
            sharedItems: [{ n: 32 }],
        })).not.toThrow();
        expect(() => manager.validate("urn:acme:other#TestEvent3", {
            type: "current_name",
            sharedItems: [{ n: 32 }],
        })).toThrow("sharedNumber");
        expect(() => manager.validate("urn:acme:other#TestEvent3", {
            type: "current_name",
            sharedNumber: 10,
            sharedItems: [{ n: 32, z: false }],
        })).toThrow("unevaluatedProperty: z");
        expect(manager.censor("urn:acme:other#TestEvent4", {
            type: "test_event4",
            name: "test",
        }, { classification: "anonymous", purposes: "any" })).toBeUndefined();
        expect(() => manager.validate("urn:acme:other#TestEvent2", {
            type: "current_name",
            sharedNumber: 32,
            sharedItems: [{ n: 32 }],
        })).toThrow("abstract");
        expect(manager.censor("urn:tailjs:core#Type1", data, {
            classification: 3 /* DataClassification.Sensitive */,
            purposes: -1 /* DataPurposes.Any */,
        })).toEqual(data);
        expect(manager.censor("urn:tailjs:core#Type1", data, {
            classification: 0 /* DataClassification.Anonymous */,
            purposes: -1 /* DataPurposes.Any */,
        })).toEqual({
            testNumber: data.testNumber,
            testArray: [
                {
                    anonymousString: "gazonk",
                },
            ],
        });
        expect(() => manager.createVariableSet()).toThrow("already");
        const variables = manager.createVariableSet("urn:tailjs:core");
        expect(variables.get({ scope: "session", key: "test" })?.classification).toBe(1 /* DataClassification.Indirect */);
        expect(variables.get({ scope: "session", key: "404" })).toBeUndefined();
        expect(variables.tryValidate({ scope: "session", key: "test" }, 20)).toBe(20);
        expect(variables.censor({ scope: "session", key: "test" }, 20, {
            classification: "anonymous",
            purposes: "any",
        })).toBeUndefined();
        expect(variables.censor({ scope: "session", key: "test" }, 20, {
            classification: "indirect",
            purposes: "any",
        })).toBe(20);
        expect(variables.tryValidate({ scope: "session", key: "test" }, "test")).toBeUndefined();
        //expect(manager.validateVariableUniqueness().length).toBe(2);
    });
    it("Handles composition.", () => {
        const manager = new SchemaManager([compositionSchema]);
        expect(manager.validate("urn:tailjs:core#Test1", {
            test2: "hello",
        })).toBeDefined();
        expect(() => manager.validate("urn:tailjs:core#Test1", {
            test: "not both",
            test2: "hello",
        })).toThrow("exactly one");
    });
    it("Supports polymorphism.", () => {
        expect(() => new SchemaManager([invalidPolymorphicSchema])).toThrow("discriminate");
        const manager = new SchemaManager([polymorphicSchema]);
        expect(manager.validate("urn:tailjs:core#Test1", {
            reference: { $type: "type1", sub1: "Hello" },
        })).toBeDefined();
        expect(manager.validate("urn:tailjs:core#Test1", {
            reference: { $type: "type2", sub2: 32 },
        })).toBeDefined();
        expect(manager.validate("urn:tailjs:core#Test1", {
            reference: { $type: "type31", sub2: "32" },
        })).toBeDefined();
        expect(() => manager.validate("urn:tailjs:core#Test1", {
            reference: { $type: "type31", sub2: 32 },
        })).toThrow("string");
        expect(() => manager.validate("urn:tailjs:core#Test1", {
            reference: { $type: "type1", sub2: 32 },
        })).toThrow("sub2");
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
        expect(schema.getType("event_type_1")).toBeDefined();
        expect(schema.getType("event_type_2")).toBeDefined();
        expect(schema.getType("another_test")).toBeDefined();
    });
});
//# sourceMappingURL=SchemaManager.test.js.map