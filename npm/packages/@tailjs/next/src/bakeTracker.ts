import type { BoundaryData } from "@tailjs/client";
import { Tracker } from "@tailjs/react";
import Script, { ScriptProps } from "next/script.js";
import React, { FunctionComponent, PropsWithChildren } from "react";
import type { TrackerScriptStrategy, TrackerScriptStrategyContainer } from ".";

export type ConfiguredTrackerComponent = FunctionComponent<
  PropsWithChildren<
    {
      root?: boolean;
      initialState?: BoundaryData;
    } & TrackerScriptStrategyContainer
  >
> & {
  /**
   * Use this element as a last resort if it is otherwise impossible to make the tail.js script come before CMPs that blocks it.
   * You can optionally use the {@link TrackerScriptStrategy} `html` to force the script to be rendered as soon as possible.
   *
   * Typically, it is enough just to add the CMP tags as {@link Script} components, as long as the Tracker's script is configured
   * with the same {@link ScriptProps.strategy} or sooner.
   */
  Script: FunctionComponent<TrackerScriptStrategyContainer>;
};

export const bakeTracker = (
  { tracker: { map, script, stoppers } = {} }: any,
  clientTracker?: ConfiguredTrackerComponent,
  react?: typeof React
): ConfiguredTrackerComponent => {
  console.warn(
    "This component is obsolete. Use the `TailJsPlugin` from `@tailjs/react/webpack` instead."
  );
  return ((props: any) => props.children) as any;
};
