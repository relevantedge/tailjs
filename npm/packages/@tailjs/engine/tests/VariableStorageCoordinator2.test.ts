import {
  ScopedVariableSetter,
  TypeResolver,
  VariableSetResult,
  VariableSetter,
  VariableSuccessResult,
} from "@tailjs/types";
import { InMemoryStorage, VariableStorageCoordinator } from "../src";
import { map2 } from "@tailjs/util";

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
            },
            VariableType2: {
              properties: {
                test: {
                  primitive: "string",
                  required: true,
                },
              },
            },
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
                visibility: "trusted-write",

                reference: "VariableType1",
              },
            },
          },
        },
      },
      {
        definition: {
          namespace: "urn:test2",
          types: {
            VariableType3: {
              properties: {
                type3Prop: {
                  primitive: "string",
                  required: true,
                },
              },
            },
          },
          variables: {
            user: {
              test2: {
                purposes: {
                  functionality: true,
                },
                reference: "urn:test#VariableType2",
              },
              test3: "VariableType3",
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
        scopes: {
          user: {
            storage: new InMemoryStorage(),
          },
          session: { storage: sessionStorage },
        },
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
      await coordinator.get({
        scope: "user",
        source: null, // Default source
        key: "test1",
        entityId: "foo",
      })
    ).not.toBeNull();

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
      // Instead of `value()`, we get the full variable result and test the value property instead
      // to test the different flavors of value result promises.
      (await coordinator.get({ scope: "user", key: "test1", entityId: "foo" }))
        ?.value
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

  it("Stores in different sources (prefixes)", async () => {
    const coordinator = new VariableStorageCoordinator(
      {
        scopes: {
          user: {
            storage: new InMemoryStorage(),
            prefixes: {
              cdp: { storage: new InMemoryStorage(), schemas: ["urn:test2"] },
            },
          },
        },
      },
      createTypeResolver()
    );

    // Prefixes. The "cdp" prefix does not have the test1 variable from the first schema.
    await expect(
      coordinator.get({
        scope: "user",
        key: "test1",
        entityId: "foo",
      })
    ).resolves.toBeNull();

    // Prefixes. The "cdp" prefix does not have the test1 variable from the first schema.
    await expect(() =>
      coordinator.get({
        scope: "user",
        source: "cdp",
        key: "test1",
        entityId: "foo",
      })
    ).rejects.toThrow("not defined");

    expect(
      (
        await coordinator
          .set({
            scope: "user",
            source: "cdp",
            key: "test1",
            entityId: "foo",
            patch: () => ({ test: "CDP name" }),
          })
          .raw()
      ).status
    ).toBe(405); // Not defined.

    await coordinator.set(
      {
        scope: "user",
        source: "cdp",
        key: "test2",
        entityId: "foo",
        patch: () =>
          // Validation error
          ({ test: "CDP name" }),
      },
      { trusted: true }
    );

    await coordinator.set({
      scope: "user",
      source: "cdp",
      key: "test2",
      entityId: "foo",
      patch: () => ({ test: "CDP test" }),
    });

    expect(
      await coordinator
        .get({
          scope: "user",
          key: "test2",
          entityId: "foo",
        })
        .value()
    ).toBe(null);

    expect(
      (
        await coordinator
          .get({
            scope: "user",
            key: "test2",
            source: "cdp",
            entityId: "foo",
          })
          .value()
      ).test
    ).toBe("CDP test");
  });

  it("Queries", async () => {
    let userStorage = new InMemoryStorage();
    let prefixedUserStorage = new InMemoryStorage();
    let sessionStorage = new InMemoryStorage();
    const coordinator = new VariableStorageCoordinator(
      {
        scopes: {
          user: {
            storage: userStorage,
            prefixes: { cdp: { storage: prefixedUserStorage } },
          },
          session: { storage: sessionStorage },
        },
      },
      createTypeResolver()
    );

    const sessionIds = map2(100, (i) => "session" + i);
    const userIds = map2(20, (i) => "user" + i);

    await coordinator.set(
      map2(
        sessionIds,
        (entityId) =>
          ({
            scope: "session",
            key: "test1",
            entityId,
            value: { name: entityId },
          } satisfies ScopedVariableSetter)
      )
    );

    let { cursor, variables } = await coordinator.query(
      [{ scopes: ["session"] }],
      {
        options: { page: 10 },
      }
    );
    expect(variables.map((variable) => variable.entityId)).toEqual(
      sessionIds.slice(0, 10)
    );
    expect(cursor).toBeDefined();
    ({ cursor, variables } = await coordinator.query(
      [{ scopes: ["session"] }],
      {
        options: { page: 10, cursor },
      }
    ));

    expect(variables.map((variable) => variable.entityId)).toEqual(
      sessionIds.slice(10, 20)
    );
    expect(cursor).toBeDefined();
    ({ cursor, variables } = await coordinator.query(
      [{ scopes: ["session"] }],
      {
        options: { page: 100, cursor },
      }
    ));

    expect(variables.map((variable) => variable.entityId)).toEqual(
      sessionIds.slice(20, 100)
    );
    expect(cursor).toBeUndefined();

    await coordinator.set(
      map2(
        userIds,
        (entityId) =>
          ({
            scope: "user",
            key: "test1",
            entityId: entityId,
            value: { name: entityId },
          } satisfies ScopedVariableSetter)
      )
    );

    ({ cursor, variables } = await coordinator.query(
      [{ scopes: ["session"] }],
      {
        options: { page: 10000, cursor },
      }
    ));

    expect(variables.map((variable) => variable.entityId)).toEqual(sessionIds);
    expect(cursor).toBeUndefined();

    ({ cursor, variables } = await coordinator.query(
      [{ scopes: ["session", "user"] }],
      {
        options: { page: 10000, cursor },
      }
    ));

    expect(variables.length).toBe(120);
    expect(cursor).toBeUndefined();

    ({ cursor, variables } = await coordinator.query([{}], {
      options: { page: 10000, cursor },
    }));

    expect(variables.length).toBe(120);
    expect(cursor).toBeUndefined();

    ({ cursor, variables } = await coordinator.query(
      [{ entityIds: [userIds[2]] }],
      {
        options: { page: 10000, cursor },
      }
    ));

    expect(variables.length).toBe(1);
    expect(variables[0].value.name).toBe(userIds[2]);
    expect(cursor).toBeUndefined();

    ({ cursor, variables } = await coordinator.query(
      [{ entityIds: [userIds[1], userIds[2]] }],
      {
        options: { page: 1, cursor },
      }
    ));

    expect(variables.length).toBe(1);
    expect(variables[0].value.name).toBe(userIds[1]);
    expect(cursor).toBeDefined();

    ({ cursor, variables } = await coordinator.query(
      [{ entityIds: [userIds[1], userIds[2]] }],
      {
        options: { page: 1, cursor },
      }
    ));

    expect(variables.length).toBe(1);
    expect(variables[0].value.name).toBe(userIds[2]);
    expect(cursor).toBeDefined(); // The query also goes to the user/cdp prefix that has no rows.

    ({ cursor, variables } = await coordinator.query(
      [{ entityIds: [userIds[1], userIds[2]] }],
      {
        options: { page: 1, cursor },
      }
    ));

    expect(variables.length).toBe(0);
    expect(cursor).toBeUndefined();

    await coordinator.set(
      map2(
        sessionIds.slice(50),
        (entityId) =>
          ({
            scope: "session",
            key: "test1",
            entityId,
            patch: () => null,
          } satisfies ScopedVariableSetter)
      )
    );

    ({ cursor, variables } = await coordinator.query([{}], {
      options: { page: 10000, cursor },
    }));

    expect(variables.length).toBe(70); // Half of the test 1 variables have been deleted.
    expect(cursor).toBeUndefined();
  });
});
