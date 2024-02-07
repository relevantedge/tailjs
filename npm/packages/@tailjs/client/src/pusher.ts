import {
  addPageActivatedListener,
  addStateListener,
  getActiveTime,
  listen,
  log,
  enqueueEvent,
} from "./lib2";

//const lck = createLock("test");
export const attach = async () => {
  addPageActivatedListener((activated) => {
    // console.log(
    //   `Activated: ${activated}. Total active time: ${getActiveTime()}.`
    // );
  }, true);

  addStateListener((event, state) => {
    log(state.tab);
  });

  listen(document.body, "click", () => {
    enqueueEvent("Click!");
  });

  // let invocations = 0;
  // let clicked = false;
  // const pump = clock(
  //   async () => {
  //     const capturedClick = clicked;
  //     if (!clicked && invocations % 2 === 1) {
  //       await wait(1500);
  //     }
  //     console.log(`${++invocations}, clicked: ${capturedClick}.`);
  //   },
  //   { frequency: 1000, queue: false }
  // );

  // let testId = 1;
  // listen(document.body, "click", async (e) => {
  //   // clicked = true;
  //   // console.log(pump.active, pump.busy);
  //   // e.shiftKey && pump.toggle(!pump.active);
  //   // console.log(await pump.trigger(true));
  //   // (async () => {
  //   //   clicked = false;
  //   // })();
  //   post([`Test ${testId++}`]);
  // });
  // listen(document.body, "click", () => {
  //   updateTabState((tab) => (tab.navigated = now()));

  //   lck(async () => {
  //     console.log("Lock acquired.");
  //     await wait(5000);
  //   });
  // });
  // listen(
  //   window,
  //   "pageshow",
  //   () =>
  //     activeTabs.update(
  //       (current) => (
  //         ((current = cast(current, isObject) ?? {})[TAB_ID] = now()), current
  //       )
  //     )
  //   //activeStorage.update((current) => (current ?? 0) + 1)
  // );
  // listen(
  //   window,
  //   "pagehide",
  //   () =>
  //     activeTabs.update(
  //       (current) => (isObject(current) && delete current[TAB_ID], current)
  //     )
  //   // activeStorage.update((current: any) =>
  //   //   current > 0 ? current - 1 : current
  //   // )
  // );
};
