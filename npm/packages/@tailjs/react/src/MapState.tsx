import { PropsWithChildren } from "react";

import { TraverseFunctions, traverseNodes } from "./internal";

export interface MapStateProperties<State = any, Context = any>
  extends TraverseFunctions<State, Context>,
    PropsWithChildren {
  context: Context;
  clientComponentContext?: boolean;
}

export const MapState = <State, Context>(
  props: MapStateProperties<State, Context>
) => {
  return traverseNodes(props.children, props);
};
