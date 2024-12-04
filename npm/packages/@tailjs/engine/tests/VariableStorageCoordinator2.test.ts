import {
  ScopedVariableSetter,
  TypeResolver,
  VariableQuery,
  VariableSetResult,
  VariableSuccessResult,
} from "@tailjs/types";
import { filter2, flatMap2, map2 } from "@tailjs/util";
import {
  InMemoryStorage,
  VariableStorageContext,
  VariableStorageCoordinator,
} from "../src";

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
                purposes: {
                  performance: true,
                },
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
                classification: "direct",
                purposes: {
                  functionality: true,
                },
                reference: "urn:test#VariableType2",
              },
              test3: "VariableType3",
              test4: {
                classification: "sensitive",
                purposes: {
                  marketing: true,
                  performance: true,
                },
                reference: "urn:test#VariableType2",
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

    const narko = await coordinator.get({
      scope: "user",
      key: "test1",
      entityId: "foo",
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
      createTypeResolver(),
      { trusted: true }
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
      map2(userIds, (entityId) => ({
        scope: "user",
        key: "test1",
        entityId: entityId,
        value: { name: entityId },
      }))
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

    // Remove half the session/test1's
    await coordinator.purge([
      { scopes: ["session"], keys: ["test1"], entityIds: sessionIds.slice(50) },
    ]);

    ({ cursor, variables } = await coordinator.query([{}], {
      options: { page: 10000, cursor },
    }));

    expect(variables.length).toBe(70); // Half of the test 1 variables have been deleted.
    expect(cursor).toBeUndefined();

    await coordinator.set(
      flatMap2(
        sessionIds.slice(0, 20),
        (entityId, i) =>
          [
            {
              scope: "user",
              key: "test2",
              source: "cdp",
              entityId: userIds[i],
              value: { test: "CDP" },
            },
            {
              scope: "session",
              key: "test2",
              entityId,
              value: { name: "CDP" },
            },
            i % 2 &&
              ({
                scope: "user",
                key: "test4",
                entityId: userIds[i],
                value: { test: "Dual purpose" },
              } as const),
          ] as const
      )
    );
    ({ cursor, variables } = await coordinator.query([{}], {
      options: { page: 10000, cursor },
    }));

    expect(variables.length).toBe(120); // Half of the test 1 variables have been deleted and 20 session:test2, 20 user:test2 and 10 user:test4 have been added.
    expect(
      filter2(variables, (variable) => variable.value.test === "CDP").length
    ).toBe(20);
    expect(cursor).toBeUndefined();

    expect({
      length: (
        await coordinator.query([{}, {}], {
          options: { page: 10000 },
        })
      ).variables.length,
    }).toEqual({ length: 120 });

    for (const [queries, expectedCount, context] of [
      [[{ purposes: { functionality: true } }], 20], //user:test2
      [[{ purposes: { personalization: true } }], 20], //Functionality filter via disabled optional purpose
      [[{ purposes: { performance: true } }], 30], // session:test2 and user:test4
      [[{ purposes: { functionality: true, performance: true } }], 0], // No variable have these at the same time.
      [[{ purposes: { marketing: true, performance: true } }], 10], // user:test4
      [
        [{ scope: "session" }],
        2,
        { trusted: false, scope: { sessionId: sessionIds[0] } }, // session:test1 and session:test2
      ],
      [
        [{ scopes: ["session", "user"], purposes: { performance: true } }],
        2,
        {
          trusted: false,
          scope: { sessionId: sessionIds[0], userId: userIds[1] },
        }, // session:test2 and user:test4
      ],
      [
        [
          { purposes: { performance: true } },
          { purposes: { marketing: true, performance: true } },
        ],
        30,
      ], // session:test2 and user:test4. The last filter is redundant.
      [[{ classification: { gt: "anonymous" } }], 30], // session:test2 and user:test4
      [[{ classification: { gte: "anonymous" } }], 120], // all
      [[{ classification: { gt: "anonymous", lt: "sensitive" } }], 20], // session:test2
      [[{ classification: { gt: "sensitive" } }], 0], //// Impossible, nothing is more sensitive than sensitive
      [[{}, {}, {}], 120], // Multiple "query all" queries should still only return each variable once.
    ] satisfies [VariableQuery[], number, context?: VariableStorageContext][]) {
      expect({
        queries,
        length: (
          await coordinator.query(queries, {
            options: { page: 10000 },
            context,
          })
        ).variables.length,
      }).toEqual({ queries, length: expectedCount });
    }

    await expect(() =>
      coordinator.purge({ purposes: { performance: true } })
    ).rejects.toThrow("bulk");

    expect(
      await coordinator.purge(
        { purposes: { performance: true } },
        { options: { bulk: true } }
      )
    ).toBe(20); // Does not target user:test4 since that is also marketing.

    expect(
      await coordinator.purge(
        { purposes: { performance: true } },
        { options: { bulk: true } }
      )
    ).toBe(0);

    expect(
      await coordinator.purge(
        {
          purposes: { performance: true, marketing: true },
        },
        { options: { bulk: true } }
      )
    ).toBe(10);

    expect(await coordinator.purge({}, { options: { bulk: true } })).toBe(90); // All remaining variables
  });
});
