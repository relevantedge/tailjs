export const SSR = typeof window === "undefined";
const win = window;
const doc = document;
const nav = navigator;
const body = doc.body;
const loc = location;
const perf = performance;
const hist = win.history;
export { body, doc as document, hist as history, loc as location, nav as navigator, perf as performance, win as window, };
export const createElement = (tagName) => doc.createElement(tagName);
export const matches = (node, selector) => !!node?.matches(selector);
//# sourceMappingURL=dom-alias.js.map