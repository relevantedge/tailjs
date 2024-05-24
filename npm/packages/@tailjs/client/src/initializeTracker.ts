import { CONSENT_INFO_KEY, SCOPE_INFO_KEY } from "@constants";
import { SessionInfo, isTrackedEvent, requireFound } from "@tailjs/types";
import {
  F,
  FOREVER,
  T,
  array,
  assign,
  define,
  filter,
  flatMap,
  isArray,
  isString,
  map,
  nil,
  now,
  push,
  remove,
  required,
  sort,
  throwError,
  tryCatch,
  type Nullish,
} from "@tailjs/util";
import {
  Listener,
  Tracker,
  TrackerCommand,
  TrackerConfiguration,
  TrackerExtension,
  TrackerExtensionFactory,
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
  TrackerContext,
  VAR_URL,
  addStateListener,
  createEventQueue,
  createVariableStorage,
  httpDecode,
  isTracker,
  nextId,
  setStorageKey,
  trackerConfig,
  window,
} from "./lib2";
import { errorLogger, logError } from "./lib2/errors";
import { addDebugListeners } from "./lib2/debug-listeners";

export let tracker: Tracker;
export const initializeTracker = (config: TrackerConfiguration | string) => {
  if (tracker) return tracker;

  isString(config) && (config = httpDecode<TrackerConfiguration>(config)!);
  assign(trackerConfig, config);

  setStorageKey(remove(trackerConfig, "clientKey"));

  const apiKey = remove(trackerConfig, "apiKey");

  const queuedCommands = window[trackerConfig.name] ?? [];
  if (!isArray(queuedCommands)) {
    throwError(
      `The global variable for the tracker "${trackerConfig.name}" is used for something else than an array of queued commands.`
    );
    return;
  }

  // Extensions / listeners
  const extensions: [
    priority: number,
    extension: TrackerExtension,
    source: TrackerExtensionFactory
  ][] = [];
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
        ),
        errorLogger(listener)
      )
    );
  };

  const pendingStateCommands: TrackerCommand[] = [];

  const trackerContext: TrackerContext = {
    applyEventExtensions(event) {
      event.clientId ??= nextId();
      event.timestamp ??= now();

      insertArgs = T;
      let skip = F;
      map(extensions, ([, extension]) => {
        if (skip || extension.decorate?.(event) === F) {
          skip = T;
        }
      });

      return skip ? undefined : event;
    },
  };
  // Variables
  const variables = createVariableStorage(VAR_URL, trackerContext);

  // Main
  const events = createEventQueue(VAR_URL, trackerContext);

  let mainArgs: TrackerCommand[] | null = nil;
  let currentArg = 0;
  let insertArgs = F;

  let globalStateResolved = F;

  Object.defineProperty(window, trackerConfig.name, {
    value: (tracker = Object.freeze({
      id: "tracker_" + nextId(),
      events,
      variables,
      push: ((...commands: (TrackerCommand | string)[]) => {
        if (!mainArgs && apiKey) {
          if (commands[0] !== apiKey) {
            throw new Error("Invalid API key.");
          }
          commands.splice(0, 1);
        }

        if (!commands.length) {
          return;
        }

        let flush = F; // // Flush after these commands, optionally without waiting for other requests to finish (because the page is unloading and we have no better option even though it may split sessions.)

        commands = filter(
          flatMap(commands, (command) =>
            isString(command) ? httpDecode<TrackerCommand>(command) : command
          ),
          (command) => {
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
          }
        );

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
          mainArgs.splice(
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
                events.post(command);
              } else if (isGetCommand(command)) {
                variables.get(...array(command.get));
              } else if (isSetCommand(command)) {
                variables.set(...array(command.set));
              } else if (isListenerCommand(command)) {
                push(listeners, command.listener);
              } else if (isExtensionCommand(command)) {
                let extension: TrackerExtension | Nullish;
                if (
                  (extension = tryCatch(
                    () => command.extension.setup(tracker),
                    (e) => logError(command.extension.id, e)
                  )!)
                ) {
                  push(extensions, [
                    command.priority ?? 100,
                    extension,
                    command.extension,
                  ]);
                  sort(extensions, ([priority]) => priority);
                }
              } else if (isTrackerAvailableCommand(command)) {
                command(tracker); // Variables have already been loaded once.
              } else {
                let success = F;
                for (const [, extension] of extensions) {
                  if ((success = extension.processCommand?.(command) ?? F)) {
                    break;
                  }
                }
                !success &&
                  logError(
                    ERR_INVALID_COMMAND,
                    command,
                    "Loaded extensions:",
                    extensions.map((extension) => extension[2].id)
                  );
              }
            },
            (e) => logError(tracker, ERR_INTERNAL_ERROR, e)
          );
        }

        mainArgs = nil;
        if (flush) {
          events.post([], { flush });
        }
      }) as any,
      [isTracker]: T,
    })),
    configurable: false,
    writable: false,
  });

  // TODO: Add conditional compiler flag.
  addDebugListeners();

  addStateListener(async (event, _1, _2, unbind) => {
    // Make sure we have a session on the server before posting anything.
    // As part of this, we also get the device session ID.
    if (event === "ready") {
      const session = requireFound(
        (
          await variables.get(
            {
              scope: "session",
              key: SCOPE_INFO_KEY,
              refresh: true,
            },
            {
              scope: "session",
              key: CONSENT_INFO_KEY,
              // Refresh the consent status at every new page view in the case the server made changes in the background.
              // After that, cache it indefinitely since it is presumably only changed by the client until the next page view (in any tab).
              refresh: true,
              cache: FOREVER,
            }
          )
        )[0]
      ).value as SessionInfo;
      trackerContext.deviceSessionId = session.deviceSessionId;

      if (!session.hasUserAgent) {
        postUserAgentEvent(tracker);
        session.hasUserAgent = true;
      }
      globalStateResolved = true;
      pendingStateCommands.length && push(tracker, pendingStateCommands);

      unbind();

      push(
        tracker,
        ...map(defaultExtensions, (extension) => ({ extension })),
        ...queuedCommands,
        { set: { scope: "view", key: "loaded", value: true } }
      );
    }
  }, true);

  return tracker;
};
