export interface CosmosDbSettings {
  /**
   * The endpoint URI for the Cosmos DB account.
   * You can find this e.g. by going to the Cosmos DB account in the Azure portal, and look under Settings->Keys.
   */
  endpoint: string;

  /**
   *
   */
  key: string;

  /**
   * The name of the Cosmos DB database at the specified endpoint.
   */
  database: string;

  /**
   * The maximum number of times an operation is retried after 429 (too many requests) errors with no progress, before giving up.
   *
   * @default 5
   */
  maxRetries?: number;

  /**
   * The maximum number of times an operation is retried after transient errors before giving up.
   *
   * @default 5
   */
  maxErrorRetries?: number;

  /**
   * Number of milliseconds to way between each retry on transient errors.
   *
   * @default 500
   */
  retryDelay?: number;

  /**
   * Number of bulk operations per batch when inserting, updating, and deleting.
   *
   * @default 100
   */
  batchSize?: number;
  /**
   * Create a container per variable scope instead of using a shared one.
   * This enables clearer separation between, say, session and user data, yet it also requires more RU.
   *
   * @default false.
   */
  containerPerScope?: boolean;
}
