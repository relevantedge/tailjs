import { SCOPE_INFO_KEY } from "@constants";
import { SessionInfo, TrackedEvent, isTrackedEvent } from "@tailjs/types";
import {
  MAX_SAFE_INTEGER,
  assign,
  isArray,
  isString,
  toArray,
  tryCatch,
  type Nullish,
} from "@tailjs/util";
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
  postUserAgentEvent,
} from ".";
import {
  ERR_INTERNAL_ERROR,
  ERR_INVALID_COMMAND,
  F,
  T,
  VAR_URL,
  array,
  define,
  del,
  err,
  filter,
  httpDecode,
  isTracker,
  map,
  nextId,
  nil,
  now,
  push,
  setStorageKey,
  sort,
  splice,
  trackerConfig,
  window,
} from "./lib";
import {
  TrackerContext,
  addStateListener,
  createEventQueue,
  createVariableProvider,
} from "./lib2";

export let tracker: Tracker;
export const initializeTracker = (config: TrackerConfiguration | string) => {
  if (tracker) return tracker;

  isString(config) && (config = httpDecode<TrackerConfiguration>(config)!);

  assign(trackerConfig, config);
  setStorageKey(del(trackerConfig, "clientKey"));
  const apiKey = del(trackerConfig, "apiKey");

  const queuedCommands = window[trackerConfig.name] ?? [];
  if (!isArray(queuedCommands)) {
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

  const pendingStateCommands: TrackerCommand[] = [];
  const trackerContext: TrackerContext = {};

  // Variables
  const variables = createVariableProvider(VAR_URL, trackerContext);

  // Main
  const events = createEventQueue(VAR_URL, trackerContext);

  let mainArgs: TrackerCommand[] | null = nil;
  let currentArg = 0;
  let insertArgs = F;

  let globalStateResolved = F;

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
                    {} as any,
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

              // Allow nested calls to tracker.push from listeners and interceptors. Insert commands in the currently processed main batch.
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

                      events.post([command], false);
                      //enqueueEvent(command);
                    } else if (isGetCommand(command)) {
                      variables.get(...toArray(command.get));
                    } else if (isSetCommand(command)) {
                      variables.set(...toArray(command.set));
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
                events.post([], true);
              }
            },
          ],
          [isTracker]: [T],
        }
      ) as any),
    ],
  });

  addStateListener(async (event, _1, _2, unbind) => {
    // Make sure we have a session on the server before posting anything.
    // As part of this, we also get the device session ID.
    if (event === "ready") {
      const session = (await variables.get({
        scope: "session",
        key: SCOPE_INFO_KEY,
        cache: MAX_SAFE_INTEGER,
      }).value) as SessionInfo;
      trackerContext.deviceSessionId = session.deviceSessionId;

      if (!session.hasUserAgent) {
        postUserAgentEvent(tracker);
        session.hasUserAgent = true;
      }
      globalStateResolved = true;
      pendingStateCommands.length && push(tracker, ...pendingStateCommands);

      unbind();
    }
    push(
      tracker,
      { set: { loaded: T } },
      ...map(defaultExtensions, (extension) => ({ extension })),
      ...queuedCommands
    );
  }, true);

  return tracker;
};
