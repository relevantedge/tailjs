import { BoundaryDataMapper, ConfiguredTracker, Tracker } from "@tailjs/react";
import Script from "next/script";
import React, { FunctionComponent } from "react";

export type ClientConfiguration = {
  map?: BoundaryDataMapper;
  endpoint?: string;
  scriptTag?: FunctionComponent<{ src: string }>;
};

export const useClientConfiguration = (config: ClientConfiguration) => config;

const clientScope = "_cs";
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
