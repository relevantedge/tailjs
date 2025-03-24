import {
  BulkOperationResponse,
  Container,
  Database,
  OperationInput,
  SqlQuerySpec,
} from "@azure/cosmos";
import { VariableStorage, VariableStorageQuery } from "@tailjs/engine";
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
import {
  batch2,
  group2,
  isArray,
  map2,
  now,
  skip2,
  throwError,
} from "@tailjs/util";
import { CosmosDbSettings } from "./CosmosDbSettings";
import { clearCosmosItemProperties, CosmosDbTarget } from "./CosmosDbTarget";

const mapCosmosId = (key: VariableKey) => {
  return `${key.scope}:${key.entityId}:${key.key}`;
};

type CosmosVariable = Variable & {
  expiresAt?: Date;
  id?: string; // CosmosDB requires an id property
  _etag?: string;
  _ts?: number; // CosmosDB timestamp
};

const queryFilterToCosmosQuery = (
  containerPerScope: boolean,
  queryFilter: VariableStorageQuery
): SqlQuerySpec => {
  const conditions: string[] = [];
  const parameters: any[] = [];

  if (queryFilter.entityIds) {
    conditions.push(`ARRAY_CONTAINS(@entityIds, c.entityId)`);
    parameters.push({ name: "@entityIds", value: queryFilter.entityIds });
  }

  if (queryFilter.ifModifiedSince) {
    conditions.push(`c.modified >= @modifiedSince`);
    parameters.push({
      name: "@modifiedSince",
      value: queryFilter.ifModifiedSince,
    });
  }
  if (!containerPerScope) {
    conditions.push("c.scope = @scope");
    parameters.push({
      name: "@scope",
      value: queryFilter.scope,
    });
  }

  if (queryFilter.keys) {
    if (queryFilter.keys.exclude) {
      conditions.push(`NOT ARRAY_CONTAINS(@keys, c.key)`);
    } else {
      conditions.push(`ARRAY_CONTAINS(@keys, c.key)`);
    }
    parameters.push({ name: "@keys", value: queryFilter.keys.values });
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  return {
    query: `SELECT * FROM c ${whereClause}`,
    parameters,
  };
};

const cosmosItemToVariable = (item: any) => {
  if (!item) return item;

  item.version = item._etag;
  item.ttl = item.ttl ? item.ttl * 1000 : undefined;

  return clearCosmosItemProperties(item);
};

export class CosmosDbVariableStorage
  extends CosmosDbTarget
  implements VariableStorage
{
  private _containers: Map<string, Container> = new Map();

  constructor(settings: CosmosDbSettings) {
    super(settings);
  }

  private async _getScopeContainer(
    database: Database,
    scopeName: string
  ): Promise<Container> {
    if (!this._containers.has(scopeName)) {
      const container = await this._getOrCreateContainer(
        database,
        this._containerPerScope ? scopeName : "variables",
        () => ({
          defaultTtl: -1, // Enable TTL, but don't set a default value.
          partitionKey: { paths: ["/entityId"] },
        })
      );

      this._containers.set(scopeName, container);
    }

    return this._containers.get(scopeName)!;
  }

  async get(
    getters: readonly ReadOnlyVariableGetter[]
  ): Promise<VariableGetResult[]> {
    const resultMap = new Map<string, Variable>();

    for (const [scope, scopeGetters] of group2(getters, (key) => [
      key.scope,
      key,
    ])) {
      await this._execute(async (db) => {
        const container = await this._getScopeContainer(db, scope);
        const currentItems = await this._getVariables(container, scopeGetters);
        for (const [key, variable] of currentItems) {
          resultMap.set(key, variable);
        }
      });
    }

    return getters.map((getter) => {
      const result = resultMap.get(mapCosmosId(getter));
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
  }

  private async _getVariables(
    container: Container,
    key: VariableKey
  ): Promise<Variable | undefined>;
  private async _getVariables(
    container: Container,
    keys: readonly VariableKey[]
  ): Promise<Map<string, Variable>>;
  private async _getVariables(
    container: Container,
    keys: VariableKey | readonly VariableKey[]
  ): Promise<Variable | undefined | Map<string, Variable>> {
    if (!isArray(keys)) {
      keys = [keys];
    }

    const results = new Map<string, CosmosVariable>();
    for (let batch of batch2(keys, this._batchSize)) {
      const responses = await this._bulkWithRetry(
        "read",
        container,
        batch.map((key) => ({
          operationType: "Read",
          id: mapCosmosId(key),
          partitionKey: key.entityId,
        }))
      );
      for (const response of responses) {
        if (response.resourceBody) {
          results.set(
            response.resourceBody.id as string,
            cosmosItemToVariable(response.resourceBody)
          );
        }
      }
    }

    return results;
  }

  async set(
    values: readonly VariableValueSetter[]
  ): Promise<VariableSetResult[]> {
    const results = new Map<string, VariableSetResult>();
    const timestamp = now();

    for (const [scope, scopeSetters] of group2(values, (key) => [
      key.scope,
      key,
    ])) {
      // Process in batches
      for (let batch of batch2(scopeSetters, this._batchSize)) {
        await this._execute(async (db) => {
          const container = await this._getScopeContainer(db, scope);
          const currentVariables = await this._getVariables(container, batch);

          type OperationEntry = [
            VariableValueSetter,
            OperationInput,
            (
              result: BulkOperationResponse[number]
            ) => VariableSetResult | undefined
          ];
          const operations: OperationEntry[] = map2(batch, (setter) => {
            const key = extractKey(setter);
            const itemId = mapCosmosId(setter); // Create a unique ID
            const partitionKey = setter.entityId;

            // Handle deletion
            if (setter.value == null) {
              const existingItem = currentVariables.get(itemId);
              if (!setter.force) {
                // Don't tell about conflicts if force. Not found item may be due to a conflict so are also ignored.

                if (!existingItem) {
                  // Does not exist,
                  results.set(itemId, {
                    status: VariableResultStatus.NotFound,
                    ...key,
                  });
                  return skip2;
                }

                // Check version if not forced
                if (
                  !setter.version ||
                  existingItem.version !== setter.version
                ) {
                  results.set(itemId, {
                    status: VariableResultStatus.Conflict,
                    ...extractVariable(existingItem),
                  });
                  return skip2;
                }
              }

              if (existingItem) {
                return [
                  setter,
                  { operationType: "Delete", id: itemId, partitionKey },
                  (result) =>
                    (setter.force && result.statusCode === 404) ||
                    (result.statusCode >= 200 && result.statusCode <= 204)
                      ? {
                          status: VariableResultStatus.Success,
                          ...key,
                        }
                      : result.statusCode === 404
                      ? {
                          status: VariableResultStatus.NotFound,
                          ...key,
                        }
                      : undefined,
                ] satisfies OperationEntry;
              }
            }

            // Handle creation/update
            const expires = setter.ttl ? timestamp + setter.ttl : undefined;

            // Prepare the item
            const itemToUpsert: CosmosVariable = {
              id: itemId,
              scope,
              key: setter.key,
              created: null!,
              version: null!,
              entityId: setter.entityId,
              modified: timestamp,
              expires,
              ttl: setter.ttl ? Math.round(setter.ttl / 1000) : undefined,
              value: setter.value,
            };

            const existingItem = currentVariables.get(itemId);

            if (setter.version == null || setter.force) {
              // Force update or new item

              if (existingItem && !setter.force) {
                // This is a new item operation but item exists
                results.set(itemId, {
                  status: VariableResultStatus.Conflict,
                  ...extractVariable(existingItem),
                });
                return skip2;
              }

              // Add created timestamp from existing item
              itemToUpsert.created = existingItem?.created ?? timestamp;
            } else {
              // Version-specific update
              if (!existingItem) {
                results.set(itemId, {
                  status: VariableResultStatus.NotFound,
                  ...key,
                });
                return skip2;
              }

              if (existingItem.version !== setter.version) {
                results.set(itemId, {
                  status: VariableResultStatus.Conflict,
                  ...extractVariable(existingItem),
                });
                return skip2;
              }
            }
            return [
              setter,
              {
                operationType: "Upsert",
                resourceBody: itemToUpsert as any,
                ifMatch: setter.force
                  ? undefined
                  : existingItem
                  ? existingItem.version
                  : "",
              },
              (response) =>
                response.resourceBody && {
                  status:
                    response.statusCode === 201
                      ? VariableResultStatus.Created
                      : VariableResultStatus.Success,
                  ...extractVariable(
                    cosmosItemToVariable(response.resourceBody)
                  ),
                },
            ] satisfies OperationEntry;
          });

          const bulkResults = await this._bulkWithRetry(
            "set",
            container,
            operations.map((operation) => operation[1])
          );

          let i = 0;
          const conflictKeys: VariableKey[] = [];
          for (const bulkResult of bulkResults) {
            const [setter, , handler] = operations[i++];

            if (
              bulkResult.statusCode === 409 ||
              bulkResult.statusCode === 412
            ) {
              conflictKeys.push(setter);
              continue;
            }

            const result: VariableSetResult = handler(bulkResult) ?? {
              status: VariableResultStatus.Error,
              ...setter,
              error: `Unexpected response from Cosmos (${
                bulkResult.statusCode
              }): ${JSON.stringify(bulkResult.resourceBody)}`,
            };

            results.set(mapCosmosId(setter), result);
          }
          if (conflictKeys.length) {
            const conflictResults = await this._getVariables(
              container,
              conflictKeys
            );

            for (const key of conflictKeys) {
              const cosmosId = mapCosmosId(key);
              const current = conflictResults.get(cosmosId);
              results.set(
                cosmosId,
                current
                  ? {
                      status: VariableResultStatus.Conflict,
                      ...current,
                    }
                  : {
                      status: VariableResultStatus.NotFound,
                      ...key,
                    }
              );
            }
          }
        });
      }
    }

    return values.map((setter) => {
      const itemId = mapCosmosId(setter);
      return (
        results.get(itemId) ??
        throwError(
          `INV: All setter keys are mapped to operations. ${itemId} was not.`
        )
      );
    });
  }

  async purge(
    queries: readonly VariableStorageQuery[]
  ): Promise<number | undefined> {
    let n = 0;
    for await (const { scope, results } of this._query(queries, {
      projection: ["id", "entityId"],
    })) {
      await this._execute(async (db) => {
        const container = await this._getScopeContainer(db, scope);
        n += results.length;
        await this._bulkWithRetry(
          "purge",
          container,
          results.map((item) => ({
            operationType: "Delete",
            id: item.id!,
            partitionKey: item.entityId,
          }))
        );
      });
    }

    return n;
  }

  private async *_query<
    Projection extends keyof CosmosVariable = keyof CosmosVariable
  >(
    queries: readonly VariableStorageQuery[],
    {
      projection,
      cursor,
    }: { projection?: readonly Projection[]; cursor?: string | null } = {}
  ): AsyncGenerator<{
    scope: string;
    cursor?: string;
    results: Pick<CosmosVariable, Projection>[];
  }> {
    const match = cursor?.match(/^([^:]+)(?::(.*))?$/);
    let cursorQueryIndex = +(match?.[1] || -1);
    let i = -1;
    for (const [scope, scopeQueries] of group2(queries, (query) => [
      query.scope,
      query,
    ])) {
      for (const query of scopeQueries) {
        if (++i < cursorQueryIndex) {
          continue;
        }

        let continuationToken =
          (i === cursorQueryIndex && match?.[2]) || undefined;

        while (true) {
          const [items, nextToken] = await this._execute(async (db) => {
            const container = await this._getScopeContainer(db, scope);

            const querySpec = queryFilterToCosmosQuery(
              this._containerPerScope,
              query
            );

            if (projection && projection.length > 0) {
              const selectFields = [
                "c.id",
                ...map2(projection, (field) =>
                  field === "id" ? skip2 : `c.${field}`
                ),
              ];
              querySpec.query = querySpec.query.replace(
                "SELECT *",
                `SELECT ${selectFields.join(", ")}`
              );
            }

            const cursor = container.items.query(querySpec, {
              maxItemCount: this._batchSize,
              continuationToken,
            });

            const page = await cursor.fetchNext();
            continuationToken = page.continuationToken;
            return [
              page.resources.map(cosmosItemToVariable),
              page.hasMoreResults ? page.continuationToken : undefined,
            ];
          });

          yield {
            scope,
            cursor: nextToken ? `${i}:${nextToken}` : `${i + 1}`,
            results: items,
          };

          if (!(continuationToken = nextToken)) {
            break;
          }
        }
      }
    }
  }

  async renew(
    queries: readonly VariableStorageQuery[]
  ): Promise<number | undefined> {
    let n = 0;
    const timestamp = now();

    for await (const { scope, results } of this._query(queries, {
      projection: ["ttl", "scope", "id", "entityId"],
    })) {
      await this._execute(async (db) => {
        n += results.length;
        const container = await this._getScopeContainer(db, scope);
        const upserts: OperationInput[] = map2(results, (projection) => {
          if (!projection.ttl) {
            return skip2;
          }
          return {
            operationType: "Patch",
            id: projection.id!,
            partitionKey: projection.entityId,
            resourceBody: {
              operations: [
                {
                  op: "set",
                  path: "/expires",
                  value: timestamp + projection.ttl * 1000,
                },
                { op: "set", path: "/ttl", value: Math.round(projection.ttl) },
              ],
            },
          };
        });
        await this._bulkWithRetry("renew", container, upserts);
      });
    }

    return n;
  }

  async query(
    queries: readonly VariableStorageQuery[],
    { cursor: currentCursor }: VariableQueryOptions = {}
  ): Promise<VariableQueryResult> {
    const variables: CosmosVariable[] = [];

    for await (const { results, cursor } of this._query(queries, {
      cursor: currentCursor,
    })) {
      return {
        variables: results.map(cosmosItemToVariable),
        cursor,
      };
    }
    return {
      variables: [],
    };
  }
}
