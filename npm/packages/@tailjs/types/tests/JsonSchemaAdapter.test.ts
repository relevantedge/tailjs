import { JsonSchemaAdapter, SchemaDefinition, TypeResolver } from "../src";

describe("JsonSchemaAdapter", () => {
  it("parses", () => {
    const resolver = new TypeResolver([
      {
        definition: {
          namespace: "urn:test",
          types: {
            BaseType1: {
              //abstract: true,
              properties: {
                type: {
                  primitive: "string",
                },
              },
            },
            Type1: {
              extends: ["BaseType1"],
              properties: {
                name: {
                  primitive: "string",
                  required: true,
                },
                age: {
                  primitive: "number",
                },
              },
            },
          },
        },
      },
    ]);

    const adapter = new JsonSchemaAdapter();
    const serialized = adapter.serialize(resolver.schemas);
    console.log(serialized);

    console.log("\n\n");
    console.log(JSON.stringify(adapter.parse(serialized), null, 2));

    const resolver2 = new TypeResolver(
      adapter.parse(serialized).map((definition) => ({ definition }))
    );
    console.log(resolver2.types);
  });
});
