import {
  isSuccessResult,
  SchemaPrimitiveTypeDefinition,
  SchemaPropertyDefinition,
  SchemaSystemTypeDefinition,
  SchemaTypeDefinition,
  TypeResolver,
  Variable,
  VariableGetResult,
  VariableSetResult,
  VariableSuccessResult,
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
            user: {
              test1: "VariableType1",
            },
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
    let sessionStorage = new InMemoryStorage();
    const coordinator = new VariableStorageCoordinator(
      {
        user: new InMemoryStorage(),
        session: sessionStorage,
      },
      createTypeResolver()
    );

    let sessionVariable1 = await coordinator.set({
      scope: "session",
      key: "test1",
      entityId: "foo",
      value: { name: "test 1" },
    });
    expect(sessionVariable1.status).toBe(201);

    let userVariable1 = await coordinator.set({
      scope: "user", // Different scope
      key: "test1",
      entityId: "foo",
      value: { name: "User test 1" },
    });
    expect(userVariable1.status).toBe(201);

    expect(
      (
        await coordinator.set({
          scope: "user",
          key: "test1",
          entityId: "foo2", // Different entity
          value: { name: "User test 1" },
        })
      ).status
    ).toBe(201);

    expect(
      await coordinator
        .get({ scope: "session", key: "test1", entityId: "foo" })
        .value()
    ).toMatchObject({
      name: "test 1",
    });

    expect(
      await coordinator
        .get({ scope: "user", key: "test1", entityId: "foo" })
        .value()
    ).toMatchObject({
      name: "User test 1",
    });

    await expect(() =>
      coordinator.set({
        scope: "user",
        key: "test2",
        entityId: "foo",
        value: { name: "test 1" },
      })
    ).rejects.toThrow("405");

    await expect(() =>
      coordinator.set({
        scope: "device",
        key: "test2",
        entityId: "foo",
        value: { name: "test 1" },
      })
    ).rejects.toThrow("405");

    await expect(() =>
      coordinator.set({
        scope: "session",
        key: "test2",
        entityId: "foo",
        value: { name: "test 1" },
      })
    ).rejects.toThrow("403");

    let sessionVariable2 = await coordinator.set(
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
    expect(sessionVariable2.version).toBeDefined();
    expect(sessionVariable2.status).toBe(201);

    // Must still not be possible to set this from untrusted context, now that it has a value.
    await expect(() =>
      coordinator.set({
        scope: "session",
        key: "test2",
        entityId: "foo",
        value: { name: "test 1" },
      })
    ).rejects.toThrow("403");

    await expect(() =>
      coordinator.set(
        {
          scope: "session",
          key: "test2",
          entityId: "foo",
          value: { name: "test 2" },
        },
        { trusted: true }
      )
    ).rejects.toThrow("409"); // Conflict, no version specified.

    expect(
      (sessionVariable2 = await coordinator.set(
        {
          scope: "session",
          key: "test2",
          entityId: "foo",
          value: { name: "test 2" },
          version: sessionVariable2.version,
        },
        { trusted: true }
      )).status
    ).toBe(200);

    let failed: VariableSetResult;
    [sessionVariable2, userVariable1, failed] = (await coordinator
      .set(
        [
          {
            scope: "session",
            key: "test2",
            entityId: "foo",
            patch: (current) => ({ name: current?.name + " - updated" }),
            version: sessionVariable2.version,
          },
          {
            scope: "user",
            key: "test1",
            entityId: "foo",
            value: { name: "User test - updated" },
            version: userVariable1.version,
          },
          {
            scope: "user",
            key: "test1",
            entityId: "foo",
            value: { name: "User test - updated 2" },
            version: userVariable1.version, // Should fail.
          },
        ],
        { trusted: true }
      )
      .raw()) as any; // Raw to ignore errors.

    expect(sessionVariable2).toMatchObject({
      status: 200,
      value: {
        name: "test 2 - updated",
      },
    });
    expect(userVariable1).toMatchObject({
      status: 200,
      value: {
        name: "User test - updated",
      },
    });

    expect(failed.status).toBe(409);

    let retries = 0;
    // Now, lets simulate a race condition by overriding the memory storage.
    let originalGet = sessionStorage.get;
    originalGet = originalGet.bind(sessionStorage);
    sessionStorage.get = async (keys) => {
      const results = await originalGet(keys);
      if (++retries < 3) {
        // Patch eventually succeeds.
        const result0 = results[0] as VariableSuccessResult;
        result0.version = result0.version + "-spoofed";
      }

      return results;
    };

    await coordinator.set({
      scope: "session",
      key: "test1",
      entityId: "foo",
      patch: (current) => ({ name: current?.name + " - updated" }),
      version: sessionVariable2.version,
    });

    expect(retries).toBe(3);
  });
});
