import { ERR_DUPPLICATE_KEY, F, T, createChannel, entries, err, eventSet, fromEntries, listen, registerStartupHandler, timeout, } from ".";
const globalStateChannel = createChannel("ss");
const globalStateResolvers = {};
const [listeners, callListeners] = eventSet(true);
export { listeners as addGlobalStateResolvedListener };
export let globalStateResolved = F;
const resolveTimeout = timeout();
export const abortGlobalStateResolve = () => (resolveTimeout.finish(), T);
export const registerSharedState = (key, resolve, apply) => (globalStateResolvers[key]
    ? err(ERR_DUPPLICATE_KEY, key)
    : (globalStateResolvers[key] = [resolve, apply]),
    (value) => globalStateChannel({ [key]: value }));
registerStartupHandler(() => {
    resolveTimeout(() => ((globalStateResolved = T), callListeners()), 75);
    let hasResponse = F;
    globalStateChannel((payload, source) => payload === 1 // Ask out
        ? globalStateChannel(2, source) // Offer state
        : payload === 2
            ? // Accept state once.
                (hasResponse !== (hasResponse = T) && globalStateChannel(3, source), T)
            : // We got picked for sharing the state
                payload === 3
                    ? globalStateChannel(fromEntries(entries(globalStateResolvers, ([key, [resolve]]) => [
                        key,
                        resolve(),
                    ])), source)
                    : // Apply state
                        (entries(globalStateResolvers, ([key, [, apply]]) => apply(payload[key])),
                            resolveTimeout.finish()));
    // Ping on wakeup
    globalStateChannel(1);
    listen(window, "pageshow", () => !hasResponse && globalStateChannel(1));
    listen(window, "pagehide", () => (hasResponse = F));
});
//# sourceMappingURL=shared-state.js.map