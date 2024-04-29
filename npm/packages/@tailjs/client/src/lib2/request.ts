import {
  If,
  PrettifyIntersection,
  clock,
  createEvent,
  createLock,
  delay,
  forEachAsync,
  isDefined,
  isFunction,
  isUndefined,
  throwError,
} from "@tailjs/util";
import {
  httpDecrypt as deserialize,
  listen,
  httpEncrypt as serialize,
} from ".";

const eventQueue: string[] = [];

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

// TODO: Make shared between tabs using storage.
const requestLock = createLock(1000);

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

    isDefined(prepareResult) &&
      prepareResult !== true &&
      (currentData = prepareResult);

    dispatchRequest(
      url,
      currentData,
      retry,
      (newData) => (
        (cancel = isUndefined(currentData)), (currentData = newData)
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

        const parsed = (encrypt ? deserialize : JSON.parse)(
          await response[encrypt ? "text" : "json"]()
        );

        dispatchResponse(parsed);
        return parsed;
      })
    );
  }
};

const poster = clock(() => {
  if (eventQueue.length) {
    //log(["Posting", eventQueue.splice(0)]);
  }
}, 5000);

export const enqueueEvent = (event: string) => {
  eventQueue.push(event);
};

listen(
  document,
  "visibilitychange",
  () => document.visibilityState === "hidden" && poster.trigger()
);

// const postLock = createLock<string[]>("test_queue_lck", 2000);
// export const post = async (data: string[]) => {
//   if (
//     !(
//       await postLock(async () => {
//         let pending: string[] | undefined;
//         await tryCatchAsync(
//           async () => {
//             for (;;) {
//               postLock.data.update(
//                 (current) => ((pending = current!), undefined)
//               );
//               if (data) {
//                 pending = [...(pending ?? []), ...data];
//                 data = undefined as any;
//               }
//               if (!pending) {
//                 break;
//               }

//               log(["Posting", pending]);
//               await delay(2000);
//               if (Math.random() < 0.5) {
//                 throw new Error("Eeek!");
//               }
//               log(`Posted ${pending.length} item(s).`);
//             }
//           },
//           async (e, last) => {
//             if (last) {
//               error(
//                 `Post failed 3 times in a row, events will not be sent.`,
//                 e
//               );
//               throw e;
//             } else {
//               pending &&
//                 postLock.data.update(
//                   (current) => ((current ??= []).unshift(...pending!), current)
//                 );
//               error(`Post failed, retrying...`, e);
//               await delay(250);
//             }
//           },
//           undefined,
//           3
//         );
//       }, 0)
//     )[1]
//   ) {
//     postLock.data.update(
//       (current) => ((current ??= []).push(...data), current)
//     );
//     log("Another post is active. Queued data.");
//   }
// };
