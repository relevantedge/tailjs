import {
  ERR_DUPLICATE_KEY,
  F,
  T,
  createChannel,
  entries,
  err,
  eventSet,
  fromEntries,
  listen,
  registerStartupHandler,
  timeout,
} from ".";

const globalStateChannel = createChannel<1 | 2 | 3 | Record<string, any>>("ss");
const globalStateResolvers: Record<string, [() => any, (value: any) => void]> =
  {};

const [listeners, callListeners] = eventSet(true);

export { listeners as addGlobalStateResolvedListener };

export let globalStateResolved = F;
const resolveTimeout = timeout();

export const abortGlobalStateResolve = () => (resolveTimeout.finish(), T);

export const registerSharedState = <T>(
  key: string,
  resolve: () => T,
  apply: (value: T | undefined) => void
): ((updatedValue: T) => void) => (
  globalStateResolvers[key]
    ? err(ERR_DUPLICATE_KEY, key)
    : (globalStateResolvers[key] = [resolve, apply]),
  (value) => globalStateChannel({ [key]: value })
);

registerStartupHandler(() => {
  resolveTimeout(() => ((globalStateResolved = T), callListeners()), 75);
  let hasResponse = F;
  globalStateChannel((payload, source) =>
    payload === 1 // Ask out
      ? globalStateChannel(2, source) // Offer state
      : payload === 2
      ? // Accept state once.
        (hasResponse !== (hasResponse = T) && globalStateChannel(3, source), T)
      : // We got picked for sharing the state
      payload === 3
      ? globalStateChannel(
          fromEntries(
            entries(globalStateResolvers, ([key, [resolve]]) => [
              key,
              resolve(),
            ])
          ),
          source
        )
      : // Apply state
        (entries(globalStateResolvers, ([key, [, apply]]) =>
          apply(payload[key])
        ),
        resolveTimeout.finish())
  );
  // Ping on wakeup
  globalStateChannel(1);

  listen(window, "pageshow", () => !hasResponse && globalStateChannel(1));
  listen(window, "pagehide", () => (hasResponse = F));
});
