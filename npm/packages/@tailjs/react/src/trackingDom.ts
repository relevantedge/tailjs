import React from "react";
import ReactDOM from "react-dom";
import { Tracker, TrackerProperties } from ".";

export function createTrackingDom(props: TrackerProperties = {}) {
  return {
    ...ReactDOM,
    hydrate: (element: any, container: any, callback: any) =>
      ReactDOM.hydrate(
        React.createElement(Tracker, { ...props, children: element }),
        container,
        callback
      ) as any,
  } as typeof ReactDOM;
}
