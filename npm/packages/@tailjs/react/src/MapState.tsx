import React, { PropsWithChildren } from "react";

import {
  ConfiguredTrackerSettings,
  TraverseFunctions,
  traverseNodes,
} from "./internal";

export type MapStateProperties<State = any, Context = any> = PropsWithChildren<
  TraverseFunctions<State, Context> &
    ConfiguredTrackerSettings & {
      context: Context;
      clientComponentContext?: boolean;
    }
>;

export const MapState = <State, Context>(
  props: MapStateProperties<State, Context>
) => {
  return traverseNodes(props.children, props);
};
