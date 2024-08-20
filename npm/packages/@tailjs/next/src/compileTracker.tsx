import { ConfiguredTracker, Tracker } from "@tailjs/react";
import Script from "next/script";
import React from "react";
import { ClientConfiguration } from ".";

const clientScope = "_cs";
/**
 * "Bakes" a mapping function into a component that can be used
 * both client and server side without the limitation that functions cannot
 * be passed from server components to client components.
 *
 * To make it work some very specific boilerplate must be used where the
 * the final component that supports both client and server must be exported from
 * a file _without_ "use client" that imports itself from a "use client" file
 * that reexports it.
 *
 * Public component file:
 *
 * ```
 * // file: ConfiguredTracker.ts
 * import client from "./_client";
 * export const ConfiguredTracker = compileTracker(configuration, () => client);
 * ```
 *
 * Helper file for client component. This should be named sufficiently obscurely
 * to avoid anyone from importing the component from this file by accident:
 *
 * ```
 * // file: _client.ts
 * "use client";
 * import { ConfiguredTracker } from "./ConfiguredTracker";
 * export default ConfiguredTracker;
 * ```
 */
export const compileTracker = (
  {
    map,
    endpoint = process.env.NEXT_PUBLIC_TAILJS_API || "/api/tailjs",
    scriptTag: ScriptTag = Script,
  }: ClientConfiguration,
  clientResolver?: () => ConfiguredTracker,
  serverResolver?: () => ConfiguredTracker
): ConfiguredTracker => {
  let Client: ConfiguredTracker | undefined;
  let Server: ConfiguredTracker | undefined;

  const ConfiguredTracker: ConfiguredTracker = (props) => {
    if (clientResolver) {
      if (!Client) {
        const Inner = clientResolver();
        Client = (props) => <Inner {...{ ...props, [clientScope]: 1 }} />;
      }
      if (props.clientSide && !props[clientScope]) {
        // If we do not have a client component, we are the client.
        return <Client {...props} />;
      }
    }
    if (serverResolver) {
      Server ??= serverResolver();
    }

    return (
      <Tracker
        {...{
          map,
          clientTracker: Client,
          serverTracker: ConfiguredTracker,
          scriptTag:
            props.root !== false ? <ScriptTag src={endpoint} /> : false,
          clientComponentContext: !!props[clientScope],
          embedBoundaryData: !props[clientScope],
          children: props.children,
        }}
      />
    );
  };

  return ConfiguredTracker;
};
