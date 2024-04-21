import {
  If,
  PrettifyIntersection,
  clock,
  createEvent,
  forEach,
  isDefined,
  isUndefined,
  map,
  throwError,
} from "@tailjs/util";
import { deserialize, listen, log, serialize } from ".";
import { PostResponse, Variable, isSuccessResult } from "@tailjs/types";

const eventQueue: string[] = [];

export type RequestOptions<Beacon extends boolean = false> =
  PrettifyIntersection<
    {
      encrypt?: boolean;
    } & If<Beacon, { beacon: true }, { beacon?: false }>
  >;

const [addRequestHandler, dispatchRequest] =
  createEvent<[url: string, data: any, update: (data: any) => void]>();
const [addResponseHandler, dispatchResponse] = createEvent<[response: any]>();
export { addResponseHandler, addRequestHandler };

export const request: {
  <Data = any, Response = any>(
    url: string,
    data: Data,
    options?: RequestOptions<false>
  ): Promise<Response>;
  <Data = any>(url: string, data: Data, options: RequestOptions<true>): void;
} = async (url: string, data: any, { beacon = false, encrypt = true }: any) => {
  let cancel = false;
  dispatchRequest(
    url,
    data,
    (newData) => ((cancel = isUndefined(data)), (data = newData))
  );
  if (cancel) return undefined;

  data = encrypt ? serialize(data) : JSON.stringify(data);
  if (beacon) {
    !navigator.sendBeacon(
      url,
      new Blob([data], {
        // This content type avoids the overhead of the "preflight" request that is otherwise made by browsers in cross-domain scenarios.
        // (application/x-www-form-urlencoded could also work).
        type: "text/plain",
      })
    ) && throwError("Beacon send failed.");
  } else {
    const response = (encrypt ? deserialize : JSON.parse)(
      await (
        await fetch(url, {
          method: isDefined(data) ? "POST" : "GET",
          cache: "no-cache",
          credentials: "include",
          mode: "cors",
          headers: {
            "Content-Type": "text/plain",
          },
          body: data,
        })
      )[encrypt ? "text" : "json"]()
    );

    dispatchResponse(response);

    return response;
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
