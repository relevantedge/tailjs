import { PropsWithChildren } from "react";

import { TraverseFunctions, traverseNodes } from "./internal";

export interface MapStateProperties<State = any>
  extends TraverseFunctions<State>,
    PropsWithChildren {
  initialState?: State;
  clientComponentContext?: boolean;
}

export const MapState = <State,>(props: MapStateProperties<State>) =>
  traverseNodes(props.children, props);
