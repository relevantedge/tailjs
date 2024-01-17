import { QUERY_DEVICE } from "@constants";
import { TrackedEvent, isConsentEvent, isTrackedEvent } from "@tailjs/types";
import type { Nullish } from "@tailjs/util";
import {
  Listener,
  Tracker,
  TrackerCommand,
  TrackerConfiguration,
  TrackerExtension,
  defaultExtensions,
  isExtensionCommand,
  isFlushCommand,
  isGetCommand,
  isListenerCommand,
  isSetCommand,
  isTagAttributesCommand,
  isToggleCommand,
  isTrackerAvailableCommand,
} from ".";
import {
  ERR_INTERNAL_ERROR,
  ERR_INVALID_COMMAND,
  F,
  T,
  USR_URL,
  addGlobalStateResolvedListener,
  addQueuePostListener,
  addResponseListener,
  array,
  assign,
  commit,
  createChannel,
  define,
  del,
  enqueueEvent,
  entries,
  err,
  filter,
  fun,
  globalStateResolved,
  httpDecode,
  isTracker,
  listen,
  map,
  mapUrl,
  nextId,
  nil,
  now,
  openPromise,
  push,
  registerSharedState,
  setStorageKey,
  size,
  sort,
  splice,
  startupComplete,
  str,
  trackerConfig,
  tryCatch,
  variables,
  window,
} from "./lib";

export let tracker: Tracker;
export const initializeTracker = (config: TrackerConfiguration | string) => {
  if (tracker) return tracker;
  str(config) && (config = httpDecode(config)!);

  // Make sure the configuration has all parameters set to valid values.
  map(
    ["vars", "hub"],
    (p) => !fun(config[p]) && (config[p] = mapUrl(config[p]))
  );

  assign(trackerConfig, config);
  setStorageKey(del(trackerConfig, "clientKey"));
  const apiKey = del(trackerConfig, "apiKey");

  const queuedCommands = window[trackerConfig.name] ?? [];
  if (!array(queuedCommands)) {
    err(
      `The global variable for the tracker "${trackerConfig.name}" is used for something else than an array of queued commands.`
    );
    return;
  }

  // Extensions / listeners
  const extensions: [number, TrackerExtension][] = [];
  let listeners: Listener[] = [];
  // Extensions may post commands when constructed and while the tracker is initializing

  const callListeners = (event: string, ...args: any[]) => {
    let keep = T;
    listeners = filter(listeners, (listener) =>
      tryCatch(
        () => (
          listener[event]?.(...args, {
            tracker: tracker,
            unsubscribe: () => (keep = F),
          }),
          keep // Will be set synchronously in the unsubscribe handler before this value is returned.
        )
      )
    );
  };
  addQueuePostListener((events) => callListeners("post", events));
  const pendingStateCommands: TrackerCommand[] = [];
  addGlobalStateResolvedListener(
    () => pendingStateCommands.length && push(tracker, ...pendingStateCommands)
  );

  // Variables

  const localVariables = Object.fromEntries(
    map(
      ["view", "tags", "rendered", "loaded", "scripts", QUERY_DEVICE],
      (key) => [key, T]
    )
  );

  let publicVariables: [string, string][];
  const [getVars, setVars] = variables(
    tracker,
    (kvs) =>
      size((publicVariables = filter(kvs, ([key]) => !localVariables[key]))) &&
      updateVariables(publicVariables)
  );
  addResponseListener((_, variables) => setVars(variables));

  const updateVariables = registerSharedState(
    "vars",
    () =>
      map(
        filter(entries(getVars()), ([key]) => !localVariables[key]),
        ([key, value]) => [key, value] as const
      ),
    (vars) => vars && setVars(vars, T)
  );

  // Main

  let mainArgs: TrackerCommand[] | null = nil;
  let currentArg = 0;
  let insertArgs = F;

  define(window, {
    [trackerConfig.name]: [
      (tracker = define(
        {},
        {
          id: [nextId()],
          push: [
            (...commands: TrackerCommand[]) => {
              if (!mainArgs && apiKey) {
                if (commands[0] !== apiKey) {
                  throw new Error("Invalid API key.");
                }
                commands.splice(0, 1);
              }

              if (!commands.length) {
                return;
              }

              commands = commands.flatMap(
                (command) => (
                  !command
                    ? command
                    : typeof command === "string" &&
                      (command = httpDecode<TrackerCommand>(command)),
                  array(command) ? command : [command]
                )
              );

              let flush = F; // // Flush after these commands, optionally without waiting for other requests to finish (because the page is unloading and we have no better option even though it may split sessions.)

              commands = filter(commands, (command) => {
                if (!command) return F;

                if (isTagAttributesCommand(command)) {
                  trackerConfig.tags = assign(
                    {},
                    trackerConfig.tags,
                    command.tagAttributes
                  );
                } else if (isToggleCommand(command)) {
                  trackerConfig.disabled = command.disable;
                  return F;
                } else if (isFlushCommand(command)) {
                  flush = T;
                  return F;
                } else if (isTrackerAvailableCommand(command)) {
                  command(tracker);
                  return F;
                }
                if (
                  !globalStateResolved &&
                  !isListenerCommand(command) &&
                  !isExtensionCommand(command)
                ) {
                  pendingStateCommands.push(command);
                  return F;
                }
                // #endregion
                return T;
              });

              if (!commands.length && !flush) {
                return;
              }

              const getCommandRank = (cmd: TrackerCommand) =>
                isExtensionCommand(cmd)
                  ? -100
                  : isListenerCommand(cmd)
                  ? -50
                  : isSetCommand(cmd)
                  ? -10
                  : isTrackedEvent(cmd)
                  ? 90
                  : 0;

              // Put events last to allow listeners and interceptors from the same batch to work on them.
              // Sets come before gets to avoid unnecessary waiting
              // Extensions then listeners are first so they can evaluate the rest.
              const expanded: TrackerCommand[] = sort(commands, getCommandRank);

              // Allow nested calls to tracker.push from listerners and interceptors. Insert commands in the currently processed main batch.
              if (
                mainArgs &&
                splice(
                  mainArgs,
                  insertArgs ? currentArg + 1 : mainArgs.length,
                  0,
                  ...expanded
                )
              )
                return;

              mainArgs = expanded;

              for (currentArg = 0; currentArg < mainArgs.length; currentArg++) {
                if (!mainArgs[currentArg]) continue;
                tryCatch(
                  () => {
                    const command = mainArgs![currentArg];
                    callListeners("command", command);
                    insertArgs = F;
                    if (isTrackedEvent(command)) {
                      command.timestamp ??= now();
                      if (isConsentEvent(command)) {
                        splice(mainArgs, currentArg + 1, 0, {
                          set: { consent: command.nonEssentialTracking },
                        });
                      }

                      insertArgs = T;
                      let skip = F;
                      map(extensions, ([, extension], i) => {
                        if (
                          skip ||
                          extension.decorate?.(command as TrackedEvent) === F
                        ) {
                          skip = T;
                        }
                      });

                      if (skip) {
                        return; // Skip event and process next command.
                      }

                      enqueueEvent(command);
                    } else if (isGetCommand(command)) {
                      getVars(command.get, command.timeout);
                    } else if (isSetCommand(command)) {
                      setVars(command.set);
                      map(entries(command.set), ([key, value]) =>
                        callListeners("set", key, value)
                      );
                    } else if (isListenerCommand(command)) {
                      push(listeners, command.listener);
                    } else if (isExtensionCommand(command)) {
                      let extension: TrackerExtension | Nullish;
                      if (
                        (extension = tryCatch(
                          () => command.extension.setup(tracker),
                          (e) => err(nil, command.extension, e)
                        ))
                      ) {
                        push(extensions, [command.priority ?? 100, extension]);
                        sort(extensions, ([priority]) => priority);
                      }
                    } else if (isTrackerAvailableCommand(command)) {
                      command(tracker); // Variables have already been loaded once.
                    } else {
                      let success = F;
                      for (const [, extension] of extensions) {
                        if (
                          (success = extension.processCommand?.(command) ?? F)
                        ) {
                          break;
                        }
                      }
                      !success && err(ERR_INVALID_COMMAND, command);
                    }
                  },
                  (e) => err(ERR_INTERNAL_ERROR, nil, e)
                );
              }

              mainArgs = nil;
              if (flush) {
                commit();
              }
            },
          ],
          [isTracker]: [T],
        }
      ) as any),
    ],
  });

  startupComplete();

  push(
    tracker,
    { set: { loaded: T } },
    ...map(defaultExtensions, (extension) => ({ extension })),
    ...queuedCommands
  );

  return tracker;
};
