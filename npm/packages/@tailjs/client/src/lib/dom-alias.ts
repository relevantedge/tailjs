import type { Nullish } from "@tailjs/util";

export const SSR = typeof window === "undefined";

const win = window;
const doc = document;
const nav = navigator;
const body = doc.body;
const loc = location;
const perf = performance;
const hist = win.history;
export {
  body,
  doc as document,
  hist as history,
  loc as location,
  nav as navigator,
  perf as performance,
  win as window,
};

export const createElement = (tagName: string) => doc.createElement(tagName);

export const matches = (node: Element | Nullish, selector: string) =>
  !!node?.matches(selector);
