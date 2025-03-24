import { VariableStorage, VariableStorageQuery } from "@tailjs/engine";

import { randomUUID } from "crypto";

import {
  extractKey,
  extractVariable,
  ReadOnlyVariableGetter,
  Variable,
  VariableGetResult,
  VariableKey,
  VariableQueryOptions,
  VariableQueryResult,
  VariableResultStatus,
  VariableSetResult,
  VariableValueSetter,
} from "@tailjs/types";
import { batch2, group2, map2, mapAwait2, now, skip2 } from "@tailjs/util";
import { Db, Filter, WithId } from "mongodb";
import { MongoDbTarget } from "./MongoDbTarget";

const keyToString = (source: VariableKey) =>
  [source.scope, source.entityId, source.key].join("\0");

type MongoVariable = Variable & {
  expiresAt?: Date;
};

const queryFilterToMongo = (
  queryFilter: VariableStorageQuery,
  filter: Filter<MongoVariable> = {}
): Filter<MongoVariable> => {
  if (queryFilter.entityIds) {
    filter["entityId"] = { $in: queryFilter.entityIds };
  }

  if (queryFilter.ifModifiedSince) {
    filter["modified"] = { $gte: queryFilter.ifModifiedSince };
  }
  if (queryFilter.keys) {
    filter["key"] = queryFilter.keys.exclude
      ? { $not: { $in: queryFilter.keys.values } }
      : { $in: queryFilter.keys.values };
  }
  return filter;
};

export class MongoDbVariableStorage
  extends MongoDbTarget
  implements VariableStorage
{
  private async _getScopeCollection(db: Db, name: string) {
    const collection = db.collection<MongoVariable>(name);
    if (!(await collection.indexExists("ttl"))) {
      collection.createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 1, name: "ttl" }
      );
    }
    if (!(await collection.indexExists("key"))) {
      collection.createIndex({ entityId: 1, key: 1 }, { name: "key" });
    }
    return collection;
  }
  async get(
    getters: readonly ReadOnlyVariableGetter[]
  ): Promise<VariableGetResult[]> {
    return await this._execute(async (db) => {
      const resultMap = new Map<string, Variable>();

      for (const [scope, scopeGetters] of group2(getters, (key) => [
        key.scope,
        key,
      ])) {
        const collection = await this._getScopeCollection(db, scope);
        for await (const result of collection.find({
          $or: scopeGetters.map((getter) => ({
            entityId: getter.entityId,
            key: getter.key,
          })),
        })) {
          resultMap.set(
            keyToString(result as any),
            extractVariable(result as any)
          );
        }
      }

      return getters.map((getter) => {
        const result = resultMap.get(keyToString(getter));
        return (
          result
            ? { status: VariableResultStatus.Success, ...result }
            : {
                status: VariableResultStatus.NotFound,
                scope: getter.scope,
                key: getter.key,
                entityId: getter.entityId,
              }
        ) satisfies VariableGetResult;
      });
    });
  }

  async set(
    values: readonly VariableValueSetter[]
  ): Promise<VariableSetResult[]> {
    const results: VariableSetResult[] = [];

    const timestamp = now();
    const nextVersion = randomUUID();
    for (const [scope, scopeSetters] of group2(values, (key) => [
      key.scope,
      key,
    ])) {
      // bulkWrite does not work with optimistic concurrency since it cannot return the (maybe) updated document for each operation.

      for (const batch of batch2(scopeSetters, 5)) {
        await this._execute(async (db) => {
          const collection = await this._getScopeCollection(db, scope);

          await Promise.all(
            batch.map(async (setter): Promise<VariableSetResult> => {
              const key = extractKey(setter);

              const filter: Filter<MongoVariable> = setter.force
                ? key
                : {
                    ...key,
                    version:
                      setter.version != null
                        ? setter.version
                        : { $not: { $exists: true } },
                  };

              const expires = setter.ttl ? timestamp + setter.ttl : undefined;

              if (setter.value == null) {
                const result = await collection.deleteOne(filter);
                if (result.deletedCount) {
                  return { status: VariableResultStatus.Success, ...key };
                }
                const current = await collection.findOne({
                  key: setter.key,
                  entityId: setter.entityId,
                });
                if (!current || setter.force) {
                  return { status: VariableResultStatus.NotFound, ...key };
                }
                return {
                  status: VariableResultStatus.Conflict,
                  ...extractVariable(current),
                };
              }

              const insertData = {
                created: timestamp,
              } satisfies Pick<MongoVariable, "created">;

              const updateData = {
                scope,
                key: setter.key,
                entityId: setter.entityId,
                modified: timestamp,
                expires,
                expiresAt: expires != null ? new Date(expires) : undefined,
                ttl: setter.ttl,
                value: setter.value,
                version: nextVersion,
              } satisfies Omit<MongoVariable, "created">;

              let updated: MongoVariable | null;

              if (setter.version == null || setter.force) {
                updated = await collection.findOneAndUpdate(
                  filter,
                  setter.force
                    ? { $set: updateData, $setOnInsert: insertData }
                    : {
                        $set: {},
                        $setOnInsert: { ...updateData, ...insertData },
                      },
                  { upsert: true, returnDocument: "after" }
                );

                if (!updated) {
                  return {
                    status: VariableResultStatus.Error,
                    ...key,
                    error: "Unexpected missing document.",
                  };
                }
              } else {
                updated = await collection.findOneAndUpdate(
                  filter,
                  { $set: updateData },
                  { returnDocument: "after" }
                );
                if (updated == null) {
                  return { status: VariableResultStatus.NotFound, ...key };
                }
              }

              return setter.force || updated.version === nextVersion
                ? {
                    status: VariableResultStatus.Success,
                    ...extractVariable(updated),
                  }
                : {
                    status: VariableResultStatus.Conflict,
                    ...extractVariable(updated),
                  };
            })
          );
        });
      }
    }

    return results;
  }

  async purge(
    queries: readonly VariableStorageQuery[]
  ): Promise<number | undefined> {
    return await this._execute(async (db) => {
      let n = 0;
      for (const [scope, scopeQueries] of group2(queries, (query) => [
        query.scope,
        query,
      ])) {
        const collection = await this._getScopeCollection(db, scope);
        const result = await collection.deleteMany({
          $or: scopeQueries.map((filter) => queryFilterToMongo(filter)),
        });
        n += result.deletedCount;
      }
      return n;
    });
  }

  private async *_query<
    Projection extends keyof MongoVariable = keyof Variable
  >(
    queries: readonly VariableStorageQuery[],
    projection?: { [P in Projection]: 0 | 1 } | undefined,
    filter?: Filter<MongoVariable>
  ): AsyncGenerator<WithId<Pick<MongoVariable, Projection>>> {
    // TODO: Cursors!
    const results: any[] = [];
    await this._execute(async (db) => {
      for (const [scope, scopeQueries] of group2(queries, (query) => [
        query.scope,
        query,
      ])) {
        const collection = await this._getScopeCollection(db, scope);
        results.push(
          ...(await mapAwait2(
            collection.find(
              {
                $or: scopeQueries.map((query) =>
                  queryFilterToMongo(query, filter)
                ),
              },
              { projection }
            )
          ))
        );
      }
    });
    yield* results;
  }

  async renew(
    queries: readonly VariableStorageQuery[]
  ): Promise<number | undefined> {
    const current = await mapAwait2(
      this._query(
        queries,
        { ttl: 1, scope: 1 },
        { expiresAt: { $exists: true } }
      )
    );
    let n = 0;
    for (const [scope, docs] of group2(current, (doc) => [doc.scope, doc])) {
      n += docs.length;
      await this._execute(async (db) => {
        const timestamp = now();
        const collection = await this._getScopeCollection(db, scope);
        await collection.bulkWrite(
          map2(docs, (doc) => {
            const expires = doc.ttl ? timestamp + doc.ttl : undefined;
            return expires
              ? {
                  updateOne: {
                    filter: { _id: doc._id },
                    update: {
                      $set: { expires, expiresAt: new Date(expires) },
                    },
                  },
                }
              : skip2;
          })
        );
      });
    }
    return n;
  }

  async query(
    queries: readonly VariableStorageQuery[],
    options?: VariableQueryOptions
  ): Promise<VariableQueryResult> {
    return await mapAwait2(this._query(queries));
  }
}
