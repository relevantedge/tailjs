import {
  Container,
  ContainerRequest,
  CosmosClient,
  Database,
  ErrorResponse,
  OperationInput,
  OperationResponse,
} from "@azure/cosmos";
import { TrackerEnvironment } from "@tailjs/engine";
import { delay, withRetry } from "@tailjs/util";
import { CosmosDbSettings } from ".";

export const clearCosmosItemProperties = (item: any) => {
  if (!item) return item;
  for (const key in item) {
    if (key[0] === "_") {
      delete item[key];
    }
  }
  return item;
};

export class CosmosDbTarget {
  protected readonly _settings: CosmosDbSettings;
  protected _containerPerScope: boolean;
  protected _batchSize: number;

  constructor(settings: CosmosDbSettings) {
    this._settings = settings;
    this._batchSize = this._settings.batchSize ?? 100;
    this._containerPerScope = settings.containerPerScope ?? false;
  }

  protected async _getOrCreateContainer(
    database: Database,
    name: string,
    configure?: () => Omit<ContainerRequest, "id">
  ) {
    try {
      // Try to get the container if it exists
      const container = database.container(name);
      await container.read(); // Check if container exists
      return container;
    } catch (error) {
      if ((error as ErrorResponse)?.code === 404) {
        // Create container if it doesn't exist.
        const { container } = await database.containers.createIfNotExists({
          id: name,
          ...configure?.(),
        });

        return container;
      } else {
        throw error;
      }
    }
  }

  private _env: TrackerEnvironment;
  public async initialize(env: TrackerEnvironment): Promise<void> {
    this._env = env;
  }

  protected async _bulkWithRetry(
    errorTrace: string,
    container: Container,
    operations: OperationInput[]
  ) {
    const succeeded = new Map<OperationInput, OperationResponse>();
    const maxRetries = Math.max(1, this._settings.maxRetries ?? 5);

    let noProgress = 0;
    let pending = operations.slice(0);
    while (pending.length > 0) {
      const result = await container.items.bulk(pending, {
        continueOnError: true,
      });
      let previousCount = pending.length;
      pending = pending.filter((operation, i) => {
        const response = result[i];
        if (!response) {
          throw new Error(`No response for operation #${i}.`);
        }
        if (response.statusCode === 429) {
          return true;
        }
        succeeded.set(operation, response);
        return false;
      });

      if (pending.length > 0) {
        if (pending.length === previousCount) {
          if (noProgress++ === maxRetries) {
            throw new Error(
              `Too many requests (429) for ${errorTrace} - ${pending.length} / ${previousCount} operations could not be completed without progress after ${noProgress} attempts.`
            );
          }
        } else {
          noProgress = 0;
        }
        this._env.log(this, {
          level: "warn",
          message: `Too many requests (429) for ${errorTrace} - ${pending.length} / ${previousCount} operations could not be completed. Retrying...`,
        });
        // Wait one second (Azure throttles by RU/s) and also a little bit of jitter if we are fighting for capacity with someone else.
        await delay(1000 + Math.random() * 250);
      }
    }

    return operations.map((operation) => succeeded.get(operation)!);
  }

  protected async _execute<T>(
    action: (db: Database, previousError?: any) => Promise<T>
  ): Promise<T> {
    const maxRetries = Math.max(1, this._settings.maxErrorRetries ?? 5);
    const retryDelay = Math.max(100, this._settings.retryDelay ?? 500);

    return await withRetry(
      async (retry, previousError) => {
        const client = new CosmosClient({
          endpoint: this._settings.endpoint,
          key: this._settings.key, // Your primary key
        });
        const db = client.database(this._settings.database);
        return await action(db, previousError);
      },
      {
        retries: maxRetries,
        retryDelay,
        errorFilter: (error, retry) => {
          this._env.log(this, {
            level: "error",
            message: `Request to Cosmos DB failed on attempt ${retry + 1}.`,
            error,
          });
        },
      }
    );
  }
}
