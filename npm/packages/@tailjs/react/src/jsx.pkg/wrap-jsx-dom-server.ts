import { ReactNode } from "react";
import type dom from "react-dom/server";

const visit = (children: ReactNode) => {
  if (typeof children !== "string" && children?.[Symbol.iterator]) {
    for (const child of children as Iterable<ReactNode>) {
      console.log(child);
    }
  } else {
    console.log(children);
  }
  return children;
};
export const wrapDomServer = (server: typeof dom): typeof dom => {
  console.log("Mojn");
  return {
    ...server,
    renderToPipeableStream: (children, options) =>
      server.renderToPipeableStream(visit(children), options),
    renderToReadableStream: (children, options) =>
      server.renderToReadableStream(visit(children), options),
    renderToStaticMarkup: (children, options) =>
      server.renderToStaticMarkup(visit(children), options),
    renderToString: (children, options) =>
      server.renderToString(visit(children), options),
  };
};
