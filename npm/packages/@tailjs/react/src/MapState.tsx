import React, { PropsWithChildren } from "react";

export const MapState = (props: PropsWithChildren<any>) => {
  console.warn(
    "The `MapState` component is obsolete. Use the `TailJsPlugin` from `@tailjs/react/webpack` instead."
  );
  return ((props: any) => props.children) as any;
};
