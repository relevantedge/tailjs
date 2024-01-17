import React, { PropsWithChildren } from "react";

import { TraverseFunctions, traverseNodes } from "./internal";

export type MapStateProperties<State = any, Context = any> = PropsWithChildren<
  TraverseFunctions<State, Context> & {
    context: Context;
  }
>;

export const MapState = <State, Context>(
  props: MapStateProperties<State, Context>
) => {
  return traverseNodes(props.children, {
    ...props,
    context: props.context,
  });
};
