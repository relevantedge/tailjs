import { BoundaryDataMapper, Tracker } from "@tailjs/react";
import Script from "next/script";
import React, { FunctionComponent, PropsWithChildren } from "react";

const isClientTracker = "_c";

export const createTracker = (
  {
    map,
    endpoint = process.env.NEXT_PUBLIC_TAILJS_API || "/api/tailjs",
  }: {
    map?: BoundaryDataMapper;
    endpoint?: string;
  },
  clientTracker?: Promise<{ default: FunctionComponent }>
) => {
  let ClientTracker: any = undefined;

  const ConfiguredTracker = (
    props: PropsWithChildren<{
      clientSide?: boolean;
      scriptTag?: boolean;
      embedBoundaryData?: boolean;
    }>
  ) => {
    let children = props.children as any;

    if (!ClientTracker && clientTracker) {
      const Inner = React.lazy(() => clientTracker);
      ClientTracker = (props: any) => (
        <Inner {...{ ...props, [isClientTracker]: true }} />
      );
    }

    if (props.clientSide && !props[isClientTracker]) {
      return <ClientTracker {...props}>{children}</ClientTracker>;
    }

    return (
      <Tracker
        {...{
          map,
          clientTracker: ClientTracker,
          serverTracker: ConfiguredTracker,
          scriptTag: props.scriptTag ?? <Script src={endpoint} />,
          _clientComponentContext: props[isClientTracker],
          embedBoundaryData:
            !props[isClientTracker] && (props.embedBoundaryData ?? true),
        }}
      >
        {children}
      </Tracker>
    );
  };

  return ConfiguredTracker;
};
