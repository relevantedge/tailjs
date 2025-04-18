import {
  PrettifyIntersection,
  createEvent,
  delay,
  forEachAwait2,
  isFunction,
  stop2,
  throwError,
  undefined,
} from "@tailjs/util";
import {
  REQUEST_LOCK_KEY,
  USE_ENCRYPTION,
  httpDecrypt,
  httpEncrypt,
  sharedLock,
} from ".";

export type RequestOptions<Beacon extends boolean = false> =
  PrettifyIntersection<
    {
      encrypt?: boolean;
    } & (Beacon extends true ? { beacon: true } : { beacon?: false })
  >;

const [addRequestHandler, dispatchRequest] =
  createEvent<
    [url: string, data: any, retry: number, update: (data: any) => void]
  >();
const [addResponseHandler, dispatchResponse] = createEvent<[response: any]>();
export { addRequestHandler, addResponseHandler };

const requestLock = sharedLock(REQUEST_LOCK_KEY);

/**
 * If a function, this is run before a request is made (including retries). It is run within the lock, and allows the requested data to be modified.
 * If it returns false, the request is aborted and if it returns `undefined` or `true` the existing data is used.
 */
type RequestData<T> =
  | T
  | ((data: T | undefined, retry: number) => T | boolean | undefined);

export const request: {
  <Data = any, Response = any>(
    url: string,
    data: RequestData<Data>,
    options?: RequestOptions<false>
  ): Promise<Response>;
  <Data = any>(
    url: string,
    data: RequestData<Data>,
    options: RequestOptions<true>
  ): void;
} = async (
  url: string,
  data: any,
  { beacon = false, encrypt = true }: RequestOptions<boolean> = {}
) => {
  encrypt = encrypt && USE_ENCRYPTION;
  let cancel = false;
  let currentData: any;
  let serialized: any;

  const prepareRequestData = (retry: number) => {
    const prepareResult = isFunction(data) ? data?.(currentData, retry) : data;
    if (prepareResult === false) {
      return false;
    }

    prepareResult != null &&
      prepareResult !== true &&
      (currentData = prepareResult);

    dispatchRequest(
      url,
      currentData,
      retry,
      (newData) => (
        (cancel = currentData === undefined), (currentData = newData)
      )
    );

    return cancel
      ? false
      : (serialized = encrypt
          ? httpEncrypt(currentData, true)
          : JSON.stringify(currentData));
  };

  if (beacon) {
    if (!prepareRequestData(0)) return;
    !navigator.sendBeacon(
      url,
      new Blob(currentData != null ? [serialized] : [], {
        // This content type avoids the overhead of the "preflight" request that is otherwise made by browsers in cross-domain scenarios.
        // (application/x-www-form-urlencoded could also work).
        type: "text/plain; charset=iso-8859-1",
      })
    ) && throwError("Beacon send failed.");
  } else {
    let retries = 1;
    return await requestLock(() =>
      forEachAwait2(1, async (retry) => {
        if (!prepareRequestData(retry)) return stop();

        const response = await fetch(url, {
          method: currentData != null ? "POST" : "GET",
          cache: "no-cache",
          credentials: "include",
          mode: "cors",
          headers: {
            "Content-Type": "text/plain; charset=iso-8859-1",
          },
          body: serialized,
        });

        if (response.status >= 400) {
          return retry === retries - 1
            ? stop2(throwError(`Invalid response: ${await response.text()}`))
            : (console.warn(
                `Request to ${url} failed on attempt ${retry + 1}/${3}.`
              ),
              await delay((1 + retry) * 200));
        }

        const body = encrypt
          ? new Uint8Array(await response.arrayBuffer())
          : await response.text();

        const parsed = body?.length
          ? (encrypt ? httpDecrypt : JSON.parse)?.(body as any)
          : undefined;

        if (parsed != null) {
          dispatchResponse(parsed);
        }
        return stop2(parsed);
      })
    );
  }
};
