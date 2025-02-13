import {
  TrackerEnvironment,
  VariableStorage,
  VariableStorageQuery,
} from "@tailjs/engine";
import {
  extractKey,
  ReadOnlyVariableGetter,
  Variable,
  VariableConflictResult,
  VariableDeleteResult,
  VariableErrorResult,
  VariableGetResult,
  VariableKey,
  VariableNotFoundResult,
  VariableQueryOptions,
  VariableQueryResult,
  VariableResultStatus,
  VariableSetResult,
  VariableSuccessResult,
  VariableValueSetter,
} from "@tailjs/types";
import { batch2, json2, map2, now, stringify2 } from "@tailjs/util";
import { RavenDbSettings } from ".";
import { RavenDbTarget } from "./RavenDbTarget";

type VariableDocument = VariableKey & {
  created: number;
  modified: number;
  ttl?: number;
  expires?: number;

  value: any;

  "@metadata"?: {
    "@expires"?: string;
  };
};

const UpdateExpiresScript = `this.ttl ? (this["@metadata"]["@expires"]=new Date(Date.now()+this.ttl).toISOString()) : delete this["@metadata"]["@expires"];`;

export interface RavenDbVariableStorageSettings extends RavenDbSettings {
  /**
   * Expired variables are deleted at this interval (s).
   *
   * Tail.js will configure this in your RavenDB cluster at startup.
   * If you do not want tail.js to touch the configuration of your cluster, set this value to `false` or a non-positive number.
   *
   * [Read about document expiration here](https://ravendb.net/docs/article-page/6.2/nodejs/server/extensions/expiration)
   *
   * @default 60
   */
  cleanExpiredFrequency?: number | false;
}

export class RavenDbVariableStorage
  extends RavenDbTarget
  implements VariableStorage
{
  public readonly id = "ravendb-variables";
  private readonly _cleanExpiredFrequency: number | undefined;

  constructor({
    cleanExpiredFrequency = 60,
    ...settings
  }: RavenDbVariableStorageSettings) {
    super(settings);
    this._cleanExpiredFrequency =
      cleanExpiredFrequency && cleanExpiredFrequency > 0
        ? cleanExpiredFrequency
        : undefined;
  }

  override async initialize(env: TrackerEnvironment): Promise<void> {
    await super.initialize(env);
    if (this._cleanExpiredFrequency) {
      const response = await this._request("POST", `admin/expiration/config`, {
        Disabled: false,
        DeleteFrequencyInSec: this._cleanExpiredFrequency,
      });

      if (response.error) {
        env.log(this, {
          level: "error",
          message: "Cannot configure document expiration in RavenDB.",
          error: response.error,
        });
      }
    }
  }

  async get(
    keys: readonly ReadOnlyVariableGetter[]
  ): Promise<VariableGetResult[]> {
    const results: VariableGetResult[] = [];
    for (const batch of batch2(keys, 100)) {
      const response = await this._request(
        "GET",
        `docs?${batch.map((key) => `id=${keyToDocumentId(key)}`).join("&")}`
      );

      const timestamp = now();
      const body = json2(response.body);
      const batchResults = body?.Results;
      let i = 0;
      for (const _ of batch) {
        const result = mapDocumentResult(
          response.status,
          batchResults?.[i++],
          timestamp
        );
        results.push(
          result.status === 200
            ? (mapVariableResult(200, result) as VariableSuccessResult)
            : result.status === 404
            ? mapNotFoundResult(batch[i])
            : mapErrorResult(batch[i], result)
        );
      }
    }
    return results;
  }

  async set(
    setters: readonly VariableValueSetter[]
  ): Promise<VariableSetResult[]> {
    const timestamp = now();

    const requests = setters.map((setter) => async () => {
      const createOperation = !setter.version;
      // An operation can be both create and update if the `force` flag is set.
      const updateOperation = setter.version || setter.force;
      const deleteOperation = setter.value == null;
      const version =
        setter.force || (!setter.version && setter.value != null)
          ? undefined
          : setter.version || "";
      const ttl = setter.ttl;

      const href = `docs?id=${encodeURIComponent(keyToDocumentId(setter))}`;

      const patchOptions = {
        Script: `Object.assign(this, $values); (this["@metadata"] || (this["@metadata"]={}))["@collection"]=$collection;${UpdateExpiresScript}`,
        Values: {
          values: {
            modified: timestamp,
            ...extractKey(setter),
            ttl,
            expires: ttl! > 0 ? timestamp + ttl! : undefined,
            value: setter.value,
          },
          collection: setter.scope,
        },
      };

      let response = deleteOperation
        ? await this._request("DELETE", href, undefined, {
            "If-Match": JSON.stringify(version),
          })
        : await this._request(
            "PATCH",
            href,
            {
              Patch: updateOperation
                ? patchOptions
                : {
                    // Handle the case where an document has expired by local timestamp logic
                    // but not been deleted by RavenDB's background process. ($values.modified is our local timestamp)
                    Script: `if(this.expires <= $values.modified){${patchOptions.Script}}`,
                    Values: { created: timestamp, ...patchOptions.Values },
                  },
              PatchIfMissing: createOperation
                ? {
                    ...patchOptions,
                    Values: { created: timestamp, ...patchOptions.Values },
                  }
                : undefined,
            },
            {
              "If-Match": JSON.stringify(version),
            }
          );
      let body = json2(response.body);
      let result = mapDocumentResult(
        response.status,
        body?.ModifiedDocument,
        timestamp,
        body
      );

      if (result.status === 404) {
        return mapNotFoundResult(setter);
      } else if (result.status === 500) {
        return mapErrorResult(setter, result);
      } else if (result.status === 204) {
        return deleteOperation
          ? mapDeleteResult(setter)
          : mapErrorResult(setter, result);
      }

      if (
        // Update and delete: Normal conflict response.
        result.status === 409 ||
        // Create: These requests cannot have an If-Modified header, but instead an empty Patch script
        // so if no patch was made it means the document already exists. (that is, conflict).
        (createOperation && result.body.Status === "NotModified")
      ) {
        // Get current version of the variable.
        response = await this._request("GET", href);
        body = json2(response.body);
        result = mapDocumentResult(
          response.status,
          body?.Results?.[0],
          timestamp
        );

        if (
          // RavenDB returns status 404 for get requests when exactly one document is requested,
          // so in this case we can count on it. Otherwise it's always 200.
          result.status === 404
        ) {
          // The variable has disappeared (race condition).
          return mapNotFoundResult(setter);
        }

        // We have the current version of the variable to include in the conflict response.
        if (result.status === 200) {
          return mapVariableResult(VariableResultStatus.Conflict, result);
        }

        return mapErrorResult(setter, result);
      }

      if (result.status === 200 || result.status === 201) {
        return mapVariableResult(
          createOperation && !updateOperation
            ? // Might be 200 if existing document was patched because it had expired by local timestamp logic.
              201
            : result.status,
          result
        );
      }

      return mapErrorResult(setter, result);
    });

    const results: VariableSetResult[] = [];
    for (const batch of batch2(requests, 100)) {
      results.push(...(await Promise.all(batch.map((request) => request()))));
    }
    return results;
  }

  async purge(
    queries: readonly VariableStorageQuery[]
  ): Promise<number | undefined> {
    const queryParts = queries.map((query) => queryToRql(query));
    for (const part of queryParts) {
      const response = await this._request("DELETE", "queries", part);
      if (response.error) {
        throw response.error;
      }
    }
    return undefined;
  }

  async renew(
    queries: readonly VariableStorageQuery[]
  ): Promise<number | undefined> {
    const timestamp = now();
    const queryParts = queries.map((query) =>
      queryToRql(query, {
        fixed: ["ttl != null"],
        append: `update { if(this.ttl != null){this.expires = $now + this.ttl;}${UpdateExpiresScript} }`,
      })
    );
    for (const query of queryParts) {
      if (!query) continue;
      const response = await this._request("PATCH", "queries", {
        Query: {
          Query: query.Query,
          QueryParameters: {
            ...query.QueryParameters,
            now: timestamp,
          },
        },
      });
      if (response.error) {
        throw response.error;
      }
    }
    return undefined;
  }

  async query(
    queries: readonly VariableStorageQuery[],
    { page, cursor }: VariableQueryOptions = {}
  ): Promise<VariableQueryResult> {
    if (page! <= 0) {
      return { variables: [] };
    }

    const timestamp = now();
    const variables: Variable[] = [];
    const match = cursor?.match(/^(\d+)(?::(.*))?$/);
    let offset = match ? +match[1] : 0;
    let skipId = match?.[2] || undefined;
    cursor = undefined;

    let i = 0;
    main: for (const query of queries) {
      if (i++ < offset) {
        continue;
      }
      const rql = queryToRql(query, {
        fixed:
          i - 1 === offset && skipId
            ? [`id() > ${stringify2(skipId)}`]
            : undefined,
        append: page ? `order by id() limit ${page}` : undefined,
      });

      if (!rql) continue;

      const response = await this._request("POST", "queries", rql);
      if (response.error) {
        throw response.error;
      }
      const json = json2(response.body);
      for (const result of json?.Results ?? []) {
        const variable = mapDocumentResult(200, result, timestamp).document;
        if (variable) {
          variables.push(variable);
          if (page && variables.length >= page) {
            cursor = `${offset}:${keyToDocumentId(variable)}`;
            break main;
          }
        }
      }
    }

    return {
      variables,
      cursor,
    };
  }
}

const keyToDocumentId = (key: VariableKey) =>
  `${key.scope}/${key.entityId}/${key.key}`;

const mapErrorResult = (key: VariableKey, result: OperationResult) =>
  ({
    ...extractKey(key),
    status: VariableResultStatus.Error,
    error:
      result.status >= 500
        ? result.body?.Type || result.body.Message
          ? `${result.body.Type ? result.body.Type + ": " : ""}${
              result.body.Message
            }`
          : "(unspecified error)"
        : `Unexpected response (status ${result.status}): ${result.body}.`,
  } satisfies VariableErrorResult);

const mapNotFoundResult = (key: VariableKey) =>
  ({
    status: VariableResultStatus.NotFound,
    ...extractKey(key),
  } satisfies VariableNotFoundResult);

const mapDeleteResult = (key: VariableKey) =>
  ({
    status: VariableResultStatus.Success,
    ...extractKey(key),
  } satisfies VariableDeleteResult);

const mapVariableResult = (
  status:
    | VariableResultStatus.Created
    | VariableResultStatus.Success
    | VariableResultStatus.Conflict,
  {
    document: {
      scope,
      entityId,
      key,
      created,
      modified,
      ttl,
      expires,
      value,
      version,
    },
  }: OperationDocumentResult
) =>
  ({
    status,
    scope,
    entityId,
    key,
    created,
    modified,
    ttl,
    expires,
    value,
    version,
  } satisfies VariableSuccessResult | VariableConflictResult);

type OperationDocumentResult = {
  status: 200 | 201;
  body: any;
  document: VariableDocument & { version: string };
};
type OperationResult =
  | OperationDocumentResult
  | { status: 204 | 404 | 409 | 500; body: any; document?: undefined };

const mapDocumentResult = (
  status: number,
  document: VariableDocument | undefined,
  timestamp: number,
  body?: any
): OperationResult => {
  if (status === 204 || status === 404 || status === 409 || status === 500) {
    return { status, body };
  } else if (!document) {
    return status === 200 || status === 201
      ? { status: 404, body }
      : {
          status: 500,
          body: { Message: `Unsupported status code: ${status}` },
        };
  }

  if (document.expires! - timestamp <= 0) {
    // We do not base our TTL calculations of Raven's dates.
    return { status: 404, body };
  }

  const { scope, entityId, key, created, modified, ttl, expires, value } =
    document;
  return {
    status: status as any,
    body,
    document: {
      scope,
      entityId,
      key,
      created,
      modified,
      ttl,
      expires,
      value,
      version: body?.ChangeVector ?? document["@metadata"]?.["@change-vector"],
    },
  };
};

const queryToRql = (
  query: VariableStorageQuery,
  {
    fixed,
    ifEmpty,
    append,
  }: { fixed?: string[]; ifEmpty?: string[]; append?: string } = {}
) => {
  let where: string[] = fixed ? [...fixed] : [];

  const { entityIds, keys } = query;
  if (entityIds) {
    if (!entityIds.length) {
      return null;
    }

    if (keys?.exclude != false) {
      // Document ID prefixes unless we have specific keys (because those map to specific document IDs).
      const filters = `${entityIds
        .map(
          (entityId) =>
            `startsWith(id(),${stringify2(
              keyToDocumentId({ scope: query.scope, entityId, key: "" })
            )})`
        )
        .join(" or ")}`;
      where.push(entityIds.length > 1 ? `(${filters})` : filters);
    }

    if (keys) {
      // Specific document IDs must match (or not match).
      const comparer = keys.exclude ? "!=" : "==";
      const keyFilter = entityIds.flatMap((entityId) =>
        map2(
          keys.values,
          (key) =>
            `id() ${comparer} ${stringify2(
              keyToDocumentId({
                scope: query.scope,
                entityId,
                key,
              })
            )}`
        )
      );
      if (keyFilter.length) {
        where.push(
          keyFilter.length === 1 ? keyFilter[0] : `(${keyFilter.join(" or ")})`
        );
      } else if (!keys.exclude) {
        // No keys
        return null;
      }
    }
  } else if (keys) {
    const comparer = keys.exclude ? "!=" : "==";
    const keyFilter = map2(
      keys.values,
      (key) => `key ${comparer} ${stringify2(key)}`
    ).join(" or ");

    if (keyFilter) {
      where.push(`exact(${keyFilter})`);
    } else if (!keys.exclude) {
      return null;
    }
  }

  if (!where.length && ifEmpty?.length) {
    where = ifEmpty;
  }
  return {
    Query: `from ${query.scope}${
      where.length ? ` where ${where.join(" and ")}` : ""
    }${append ? ` ${append}` : ""}`,
    QueryParameters: {},
  };
};
