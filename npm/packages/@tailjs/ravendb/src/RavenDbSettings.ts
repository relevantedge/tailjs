export interface RavenDbSettings {
  url: string;
  database: string;
  /**
   *  The maximum number of times to retry on transient exceptions.
   *  @default 5
   */
  maxRetries?: number;

  /** The delay between each retry, if a transient exception occurred. */
  retryDelay?: number;

  x509?: (
    | { cert: Uint8Array | string; certPath?: undefined }
    | { cert?: undefined; certPath: string }
  ) &
    ({ key?: string } | { keyPath: string });
}
