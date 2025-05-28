import { CONSENT_INFO_KEY, SCOPE_INFO_KEY } from "@constants";

import { createTransport } from "@tailjs/transport";
import {
  clearSchemaMetadata,
  isTrackedEvent,
  updateTrackingData,
} from "@tailjs/types";
import {
  F,
  FOREVER,
  T,
  array,
  assign,
  filter,
  flatMap,
  forEach,
  formatDuration,
  formatTimestamp,
  isArray,
  isJsonString,
  isString,
  map,
  merge,
  nil,
  now,
  remove,
  sort,
  stop,
  throwError,
  tryCatch,
  type Nullish,
} from "@tailjs/util";
import {
  Listener,
  Tracker,
  TrackerClientConfiguration,
  TrackerCommand,
  TrackerExtension,
  TrackerExtensionFactory,
  checkTrackingEnabled,
  defaultExtensions,
  isConfigurationCommand,
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
  addDebugListeners,
  addStateListener,
  createEventQueue,
  createVariableStorage,
  debug,
  errorLogger,
  getBoundaryData,
  httpDecode,
  isTracker,
  logError,
  nextId,
  setBoundaryData,
  setStorageKey,
  trackerConfig,
  trackerFlag,
  window,
} from "./lib";

export let tracker: Tracker;
export const initializeTracker = (
  config: TrackerClientConfiguration | string
) => {
  if (tracker) return tracker;
  let clientEncryptionKey: string;
  if (isString(config)) {
    // Decode the temporary key for decrypting the configuration payload.
    [clientEncryptionKey, config] =
      httpDecode<[key: string, configuration: any]>(config)!;

    // Decrypt
    config = createTransport(clientEncryptionKey, { decodeJson: true })[1](
      config as any
    )!;
  }

  merge(trackerConfig, [config as TrackerClientConfiguration], {
    overwrite: true,
  });

  setStorageKey(remove(trackerConfig, "encryptionKey"));

  const apiProtectionKey = remove(trackerConfig, "key");

  const queuedCommands: any[][] = window[trackerConfig.name]?._ ?? [];
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
      const skip = forEach(
        extensions,
        ([, extension]) => extension.decorate?.(event) === F && stop(true)
      );

      return skip ? undefined : event;
    },
    validateKey: (key: string | Nullish, throwIfInvalid = true) =>
      (!apiProtectionKey && !key) ||
      key === apiProtectionKey ||
      ((throwIfInvalid
        ? throwError(`'${key}' is not a valid key.`)
        : false) as any),
  };
  // Variables
  const variables = createVariableStorage(VAR_URL, trackerContext);

  // Main
  const events = createEventQueue(VAR_URL, trackerContext);

  let boundaryDataDefaults = updateTrackingData(
    getBoundaryData(document.documentElement),
    getBoundaryData(document.body)
  );

  if (!checkTrackingEnabled(document.body)) {
    ((boundaryDataDefaults ??= {}).tracking ??= {}).disable = true;
    trackerConfig.disabled = true;
  }

  let mainArgs: TrackerCommand[] | null = nil;
  let currentArg = 0;
  let insertArgs = F;

  let globalStateResolved = F;

  let ready = false;
  tracker = ((...commands: (TrackerCommand | string)[]) => {
    if (!ready) {
      queuedCommands.push([commands]);
      return;
    }

    if (!commands.length) {
      return;
    }

    let key: string | Nullish;
    if (commands.length > 1 && (!commands[0] || isString(commands[0]))) {
      key = commands[0];
      commands = commands.slice(1);
    }

    if (isString(commands[0])) {
      const payload = commands[0];
      commands = !payload
        ? []
        : isJsonString(payload)
        ? JSON.parse(payload)
        : httpDecode(payload);
    }

    let flush = F; // // Flush after these commands, optionally without waiting for other requests to finish (because the page is unloading and we have no better option even though it may split sessions.)

    commands = filter(
      flatMap(commands, (command) =>
        command && isString(command)
          ? httpDecode<TrackerCommand>(command)
          : command
      ) as TrackerCommand[],
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
        } else if (isConfigurationCommand(command)) {
          boundaryDataDefaults = updateTrackingData(boundaryDataDefaults, {
            tracking: command.tracking,
          })?.tracking;

          if (boundaryDataDefaults?.tracking?.disable != null) {
            trackerConfig.disabled = boundaryDataDefaults.tracking.disable;
          }
          setBoundaryData(document.body, boundaryDataDefaults);
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

    if (!commands || (!commands.length && !flush) || trackerConfig.disabled) {
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
    const expanded = sort(commands as TrackerCommand[], getCommandRank);

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
    try {
      for (currentArg = 0; currentArg < mainArgs.length; currentArg++) {
        const command = mainArgs![currentArg];

        if (!command) continue;

        trackerContext.validateKey(key ?? command.key),
          tryCatch(
            () => {
              const command = mainArgs![currentArg];
              callListeners("command", command);
              insertArgs = F;
              if (isTrackedEvent(command)) {
                events.post(command);
              } else if (isGetCommand(command)) {
                variables.get(array(command.get));
              } else if (isSetCommand(command)) {
                variables.set(array(command.set));
              } else if (isListenerCommand(command)) {
                listeners.push(command.listener);
              } else if (isExtensionCommand(command)) {
                let extension: TrackerExtension | Nullish;
                if (
                  (extension = tryCatch(
                    () => command.extension.setup(tracker),
                    (e) => logError(command.extension.id, e)
                  )!)
                ) {
                  extensions.push([
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
                    map(extensions, (extension) => extension[2].id)
                  );
              }
            },
            (e) => logError(tracker, ERR_INTERNAL_ERROR, e)
          );
      }
    } finally {
      mainArgs = nil;
    }
    if (flush) {
      events.post([], { flush });
    }
  }) as any;

  Object.defineProperty(window, trackerConfig.name, {
    value: Object.freeze(
      Object.assign(tracker, {
        id: "tracker_" + nextId(),
        events,
        variables,
        [isTracker]: T,
      })
    ),
    configurable: false,
    writable: false,
  });

  // TODO: Add conditional compiler flag.
  addDebugListeners();

  addStateListener(async (event, _1, _2, unbind) => {
    // Make sure we have a session on the server before posting anything.
    // As part of this, we also get the device session ID.
    if (event === "ready") {
      const [session, consent, deviceInfo] = await variables
        .get([
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
          },
          {
            scope: "device",
            key: SCOPE_INFO_KEY,
            cache: true,
          },
        ])
        .values(false);

      if (!session) {
        console.warn("No session. Tracking is disabled;");
        return;
      }

      debug(
        {
          consent: clearSchemaMetadata(consent),
          session: {
            firstSeenDate: formatTimestamp(session.firstSeen),
            lastSeenDate: formatTimestamp(session.lastSeen),
            duration: formatDuration(session.lastSeen - session.firstSeen),
            ...clearSchemaMetadata(session),
          },
          device: deviceInfo
            ? {
                firstSeenDate: formatTimestamp(deviceInfo.firstSeen),
                lastSeenDate: formatTimestamp(deviceInfo.lastSeen),
                duration: formatDuration(
                  deviceInfo.lastSeen - deviceInfo.firstSeen
                ),
                ...clearSchemaMetadata(deviceInfo),
              }
            : "(anonymous session)",
        },
        "Session and device info"
      );

      trackerContext.deviceSessionId = session.deviceSessionId;

      globalStateResolved = true;

      unbind();

      // Now we accept commands.
      ready = true;
      tracker(...map(defaultExtensions, (extension) => ({ extension })));
      if (!session.hasUserAgent) {
        postUserAgentEvent(tracker);
        session.hasUserAgent = true;
      }

      pendingStateCommands.length && tracker(pendingStateCommands);
      for (const commandGroup of queuedCommands) {
        if (commandGroup.length) {
          (tracker as any)(...commandGroup);
        }
      }
      tracker({ set: { scope: "view", key: "loaded", value: true } });
    }
  }, true);

  return tracker;
};
