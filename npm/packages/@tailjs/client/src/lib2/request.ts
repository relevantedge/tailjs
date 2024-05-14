import { isPostResponse } from "@tailjs/types";
import {
  If,
  NOOP,
  Nullish,
  PrettifyIntersection,
  clock,
  createEvent,
  delay,
  escapeRegEx,
  forEachAsync,
  isFunction,
  match,
  throwError,
  undefined,
} from "@tailjs/util";
import {
  REQUEST_LOCK_KEY,
  httpDecrypt as deserialize,
  httpEncrypt as serialize,
  sharedLock,
  trackerConfig,
} from ".";

export type RequestOptions<Beacon extends boolean = false> =
  PrettifyIntersection<
    {
      encrypt?: boolean;
    } & If<Beacon, { beacon: true }, { beacon?: false }>
  >;

const [addRequestHandler, dispatchRequest] =
  createEvent<
    [url: string, data: any, retry: number, update: (data: any) => void]
  >();
const [addResponseHandler, dispatchResponse] = createEvent<[response: any]>();
export { addRequestHandler, addResponseHandler };

const requestLock = sharedLock(REQUEST_LOCK_KEY);

let pushCookieMatcher: RegExp | undefined;
let pushCookie: string | Nullish;
const pollPushCookie = clock(() => {
  if (pushCookie !== (pushCookie = trackerConfig.pushCookie ?? undefined)) {
    if (!pushCookie) return;
    pushCookieMatcher = new RegExp(escapeRegEx(pushCookie) + "=([^;]*)");
  }
  const value = deserialize?.(match(document.cookie, pushCookieMatcher)?.[1]);
  if (isPostResponse(value)) {
    dispatchResponse(value);
  }
}, 1000);

/** The number of "threads" anticipating a push cookie. When this is zero, the poll frequency goes down. */
let pushExpectations = 0;
/**
 *  Call this before making a request or otherwise doing something where you anticipate the server to set a push cookie.
 *  (Preparing for a redirect that pushes a cookie via context menu navigation is an example that does not make a request per se.)
 *
 *  Call the function returned as soon as possible, and DEFINITELY call the function at some point if a non-positive timeout is used
 *  lest eager polling will get stuck indefinitely.
 * */
export const anticipatePushCookie = (timeout = 1000) => {
  let pushTimeout = 0;
  let done = () => {
    done = NOOP; // Prevent further invocations.
    if (!--pushExpectations) {
      pollPushCookie.restart(1000);
      clearTimeout(pushTimeout);
    }
  };
  if (!pushExpectations++) {
    pollPushCookie.restart(100);
  }
  timeout > 0 && setTimeout(done, timeout);
  return done();
};

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
      : (serialized = (encrypt ? serialize : (JSON.stringify as any))(
          currentData
        ));
  };

  if (beacon) {
    if (!prepareRequestData(0)) return;
    anticipatePushCookie(1000);

    !navigator.sendBeacon(
      url,
      new Blob(currentData != null ? [serialized] : [], {
        // This content type avoids the overhead of the "preflight" request that is otherwise made by browsers in cross-domain scenarios.
        // (application/x-www-form-urlencoded could also work).
        type: "text/plain",
      })
    ) && throwError("Beacon send failed.");
  } else {
    return await requestLock(() =>
      forEachAsync(4, async (retry) => {
        if (!prepareRequestData(retry)) return;

        const response = await fetch(url, {
          method: currentData != null ? "POST" : "GET",
          cache: "no-cache",
          credentials: "include",
          mode: "cors",
          headers: {
            "Content-Type": "text/plain",
          },
          body: serialized,
        });

        if (response.status >= 400) {
          return retry === 3
            ? throwError(`Invalid response: ${await response.text()}`)
            : (console.warn(
                `Request to ${url} failed on attempt ${retry + 1}/${3}.`
              ),
              await delay((1 + retry) * 200));
        }

        const parsed = (encrypt ? deserialize : JSON.parse)?.(
          await response[encrypt ? "text" : "json"]()
        );

        if (parsed != null) {
          dispatchResponse(parsed);
        }
        return parsed;
      })
    );
  }
};
