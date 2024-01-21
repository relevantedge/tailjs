type AllMaps = WindowEventMap &
  GlobalEventHandlersEventMap &
  DocumentEventMap &
  HTMLElementEventMap;

export type Rebinder = () => boolean;
export type Unbinder = () => boolean;
export type Binders = [unbind: Unbinder, rebind: Rebinder];

export const combine = <T extends (...args: any) => any>(
  ...functions: T[]
): T extends (...args: infer A) => infer R
  ? (...args: A) => R extends void ? void : R[]
  : never => ((...args: any[]) => functions.map((f) => f(...args))) as any;

export type Listener<Arg> = (arg: Arg, unbind: Unbinder) => void;
export const createBinders = <Arg>(
  listener: Listener<Arg>,
  attach: (listener: (arg: Arg) => void) => void,
  detach: (listener: (arg: Arg) => void) => void
): Binders => {
  let bound = false;
  const unbind = () =>
    bound !== (bound = false) && (detach(outerListener), true);
  const rebind = () =>
    bound !== (bound = true) && (attach(outerListener), true);

  const outerListener = (arg: Arg) => listener(arg, unbind);
  rebind();
  return [unbind, rebind];
};

export const listen = <K extends keyof AllMaps>(
  target: {
    addEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ): void;
    removeEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | EventListenerOptions
    ): void;
  },
  name: K,
  listener: (ev: AllMaps[K], unbind?: Unbinder) => any,
  options: AddEventListenerOptions = { capture: true, passive: true }
) =>
  createBinders(
    listener,
    (listener) => target.addEventListener(name, listener, options),
    (listener) => target.addEventListener(name, listener, options)
  );

// export const listen = <K extends keyof AllMaps>(
//   el: any,
//   names: K[] | K,
//   cb: (ev: AllMaps[K], unbind: () => void) => void,
//   capture = true,
//   passive = true
// ) => {
//   let unbinders: any[] = [];

//   return (
//     toArray(names).map((name, i) => {
//       const mapped = (ev: any) => {
//         cb(ev, unbinders[i]);
//       };
//       push(unbinders, () => el.removeEventListener(name, mapped, capture));
//       return el.addEventListener(name, mapped, { capture, passive });
//     }),
//     () =>
//       unbinders.length > 0 && map(unbinders, (unbind) => unbind())
//         ? ((unbinders = []), T)
//         : F
//   );
// };
