import {
  VariableKey,
  VariableResultStatus,
  VariableSuccessResult,
} from "@tailjs/types";
import { add2, delay, map2, MaybePromise, throwError } from "@tailjs/util";
import { VariableStorage } from "../src";

export type StorageFactory = () => MaybePromise<VariableStorage>;

const createStorage = (factory?: StorageFactory) =>
  (
    factory ??
    storageTests.storageFactory ??
    throwError("No default storage factory configured")
  )();

const keyToString = ({ scope, entityId, key }: VariableKey) =>
  [scope, entityId, key].join("|");

export const storageTests = {
  testScopes: ["test", "test1", "test2"],
  storageFactory: null as StorageFactory | null,
  tests: {
    crud: async (storageFactory?: StorageFactory) => {
      const storage = await createStorage(storageFactory);

      let variable = (
        await storage.get([{ scope: "test", key: "test", entityId: "test" }])
      )[0];
      expect(variable.status).toBe(VariableResultStatus.NotFound);

      expect(
        (
          await storage.set([
            { scope: "test", key: "test", entityId: "test", value: "test" },
          ])
        )[0]
      ).toMatchObject({ status: VariableResultStatus.Created });

      variable = (
        await storage.get([{ scope: "test", key: "test", entityId: "test" }])
      )[0] as VariableSuccessResult;
      expect(variable).toMatchObject({
        status: VariableResultStatus.Success,
        value: "test",
      });

      expect(
        (
          await storage.set([
            { scope: "test", key: "test", entityId: "test", value: null },
          ])
        )[0]
      ).toMatchObject({ status: VariableResultStatus.Conflict });

      expect(
        (
          await storage.get([{ scope: "test2", key: "test", entityId: "test" }])
        )[0]
      ).toMatchObject({ status: VariableResultStatus.NotFound });

      expect(
        (
          await storage.set([
            { scope: "test2", key: "test", entityId: "test", value: null },
          ])
        )[0]
        // Cannot delete something that does not exist.
      ).toMatchObject({ status: VariableResultStatus.NotFound });

      expect(
        (
          await storage.set([
            {
              scope: "test",
              key: "test",
              entityId: "test",
              version: variable.version,
              value: null,
            },
          ])
        )[0]
      ).toMatchObject({ status: VariableResultStatus.Success });

      variable = (
        await storage.get([{ scope: "test", key: "test", entityId: "test" }])
      )[0];
      expect(variable.status).toBe(VariableResultStatus.NotFound);

      // Set many
      const manyKeys = map2(100, (i) => ({
        scope: "test1",
        entityId: `many${i % 10}`,
        key: `many${i}`,
      }));
      const manySetResults = await storage.set(
        manyKeys.map((key) => ({ ...key, value: "test" }))
      );

      expect(manySetResults.length).toBe(100);

      expect([
        ...new Set(manySetResults.map((result) => result.status)),
      ]).toEqual([VariableResultStatus.Created]);

      let manyGetResults = await storage.get([
        ...manyKeys,
        { scope: "404", entityId: "404", key: "404" },
      ]);
      expect(manyGetResults.length).toBe(101);
      expect(manyGetResults[manyGetResults.length - 1].status).toBe(
        VariableResultStatus.NotFound
      );
      manyGetResults.splice(-1, 1);
      const seen = new Set<string>();
      expect([
        ...new Set(
          manyGetResults.map(
            (result) => (seen.add(keyToString(result)), result.status)
          )
        ),
      ]).toEqual([VariableResultStatus.Success]);

      expect(manyKeys.filter((key) => seen.has(keyToString(key))).length).toBe(
        100
      );
    },

    query: async (storageFactory?: StorageFactory) => {
      const storage = await createStorage(storageFactory);

      expect([
        ...new Set(
          (
            await storage.set([
              { scope: "test1", entityId: "test1", key: "key1", value: true },
              { scope: "test1", entityId: "test1", key: "key2", value: true },
              { scope: "test1", entityId: "test2", key: "key1", value: true },
              { scope: "test2", entityId: "test1", key: "key1", value: true },
              { scope: "test2", entityId: "test1", key: "key3", value: true },
            ])
          ).map((result) => result.status)
        ),
      ]).toEqual([VariableResultStatus.Created]);

      expect((await storage.query([{ scope: "test1" }])).variables.length).toBe(
        3
      );
      expect((await storage.query([{ scope: "test2" }])).variables.length).toBe(
        2
      );
      expect(
        (await storage.query([{ scope: "test1", keys: { values: ["key1"] } }]))
          .variables.length
      ).toBe(2);
      expect(
        (await storage.query([{ scope: "test2", keys: { values: ["key2"] } }]))
          .variables.length
      ).toBe(0);
      expect(
        (
          await storage.query([
            { scope: "test1", keys: { exclude: true, values: ["key2"] } },
          ])
        ).variables.length
      ).toBe(2);
      expect(
        (
          await storage.query([
            { scope: "test1", keys: { exclude: true, values: ["key1"] } },
          ])
        ).variables.length
      ).toBe(1);
      expect(
        (
          await storage.query([
            { scope: "test1", keys: { exclude: true, values: [] } },
          ])
        ).variables.length
      ).toBe(3);
      expect(
        (await storage.query([{ scope: "test1", entityIds: ["test1"] }]))
          .variables.length
      ).toBe(2);
      expect(
        (
          await storage.query([
            { scope: "test1", keys: { exclude: false, values: [] } },
          ])
        ).variables.length
      ).toBe(0);
      expect(
        (await storage.query([{ scope: "test2", keys: { values: ["key1"] } }]))
          .variables.length
      ).toBe(1);

      await storage.set(
        map2(9, (i) => ({
          scope: "test1",
          entityId: "test3",
          key: `item${i}`,
          value: true,
        }))
      );

      expect(
        (await storage.query([{ scope: "test1" }, { scope: "test2" }]))
          .variables.length
      ).toBe(14);

      await storage.purge([{ scope: "test1", keys: { values: ["key1"] } }]);

      expect((await storage.query([{ scope: "test1" }])).variables.length).toBe(
        10
      );
      expect(
        (await storage.query([{ scope: "test1" }, { scope: "test2" }]))
          .variables.length
      ).toBe(12);

      for (let [queries, n] of [
        [[{ scope: "test1" }], 10] as const,
        [[{ scope: "test1" }, { scope: "test2" }], 12] as const,
      ]) {
        // Paging
        let cursor: string | undefined;
        let pageSize = 2;
        const seen = new Set<string>();
        while (true) {
          const results = await storage.query(queries, {
            page: pageSize++,
            cursor,
          });
          for (const result of results.variables) {
            const variableKey = keyToString(result);

            expect(add2(seen, variableKey)).toBe(true);
            --n;
          }
          if (!(cursor = results.cursor)) {
            break;
          }
        }
        expect(n).toBe(0);
      }
    },

    ttl: async (storageFactory?: StorageFactory) => {
      const storage = await createStorage(storageFactory);

      const key = { scope: "test1", key: "test", entityId: "test" };
      await storage.set([
        { ...key, ttl: 1, value: { id: "1234", device: "123" } },
      ]);
      await storage.set([
        {
          ...key,
          entityId: "test2",
          ttl: 1,
          value: { id: "1234", device: "243" },
        },
      ]);

      await delay(100);
      expect((await storage.get([{ ...key }]))[0].status).toBe(
        VariableResultStatus.NotFound
      );
      expect(
        (await storage.query([{ scope: key.scope }])).variables.length
      ).toBe(0);
      await storage.set([
        {
          ...key,
          entityId: "test2",
          ttl: 1,
          value: { id: "1234", device: "243" },
        },
      ]);

      expect(
        (
          await storage.set([
            { ...key, ttl: 500, value: { id: "1234", device: "456" } },
          ])
        )[0].status
      ).toBe(201);
      const snapshot = (
        await storage.get([{ ...key }])
      )[0] as VariableSuccessResult;
      expect(snapshot.value).toMatchObject({
        device: "456",
      });

      await delay(10);
      await storage.renew([{ scope: "test1" }]);

      const current = (
        await storage.get([{ ...key }])
      )[0] as VariableSuccessResult;
      expect(current.expires).toBeGreaterThan(snapshot.expires!);
    },
  },
};
