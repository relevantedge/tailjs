import {
  isSuccessResult,
  SchemaPrimitiveTypeDefinition,
  SchemaPropertyDefinition,
  SchemaSystemTypeDefinition,
  SchemaTypeDefinition,
  TypeResolver,
} from "@tailjs/types";
import { InMemoryStorage, VariableStorageCoordinator } from "../src";

describe("VariableStorageCoordinator", () => {
  const createTypeResolver = () => {
    return new TypeResolver([
      {
        definition: {
          namespace: "urn:test",
          types: {
            VariableType1: {
              properties: {
                name: {
                  primitive: "string",
                  required: true,
                },
                age: {
                  primitive: "number",
                },
              },
            } as SchemaSystemTypeDefinition,
            VariableType2: {
              properties: {
                test: {
                  primitive: "string",
                  required: true,
                },
              },
            } as SchemaSystemTypeDefinition,
          },
          variables: {
            session: {
              test1: {
                reference: "VariableType1",
              },
              test2: {
                access: {
                  visibility: "trusted-write",
                },
                reference: "VariableType1",
              },
            },
          },
        },
      },
    ]);
  };

  it("Stores", async () => {
    const coordinator = new VariableStorageCoordinator(
      {
        session: new InMemoryStorage(),
      },
      createTypeResolver()
    );

    let variable = await coordinator.set({
      scope: "session",
      key: "test1",
      entityId: "foo",
      value: { name: "test 1" },
    });

    expect(
      await coordinator
        .get({ scope: "session", key: "test1", entityId: "foo" })
        .value()
    ).toMatchObject({
      name: "test 1",
    });

    await expect(
      async () =>
        await coordinator.set({
          scope: "session",
          key: "test2",
          entityId: "foo",
          value: { name: "test 1" },
        })
    ).rejects.toThrow("403");

    variable = await coordinator.set(
      {
        scope: "session",
        key: "test2",
        entityId: "foo",
        value: { name: "test 1" },
      },
      {
        trusted: true,
      }
    );
    expect(variable.version).toBeDefined();
    expect(variable.status).toBe(201);
  });
});
