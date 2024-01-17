import * as React from "react";
import * as ReactDOMServer from "react-dom/server";
import { Tracker, TrackerProperties } from ".";

export function createTrackingServerDom(
  props: TrackerProperties = {}
): typeof ReactDOMServer {
  // renderToPipeableStream is not always exported by react-dom/server (may be aliased)
  // so it gives an error when trying to use it. (E.g. not in webpack/nextjs 13.4)
  const wrapper = ReactDOMServer as any;
  return {
    ...ReactDOMServer,

    renderToString(element: React.ReactElement) {
      return wrapper.renderToString(
        React.createElement(Tracker, { ...props, children: element })
      );
    },

    renderToStaticMarkup(element: React.ReactElement) {
      return wrapper.renderToStaticMarkup(
        React.createElement(Tracker, { ...props, children: element })
      );
    },
    renderToPipeableStream(
      children: React.ReactNode,
      options?: ReactDOMServer.RenderToPipeableStreamOptions
    ) {
      return wrapper.renderToPipeableStream(
        React.createElement(Tracker, { ...props, children }),
        options
      );
    },
    renderToNodeStream(element: React.ReactElement) {
      return wrapper.renderToNodeStream(
        React.createElement(Tracker, { ...props, children: element })
      );
    },
    renderToReadableStream(
      children: React.ReactNode,
      options?: ReactDOMServer.RenderToReadableStreamOptions
    ) {
      return wrapper.renderToReadableStream(
        React.createElement(Tracker, { ...props, children }),
        options
      );
    },
    renderToStaticNodeStream(element: React.ReactElement) {
      return wrapper.renderToStaticNodeStream(
        React.createElement(Tracker, { ...props, children: element })
      );
    },
  };
}
