import { clock } from "@tailjs/util";
import { listen, log } from ".";

const eventQueue: string[] = [];

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
