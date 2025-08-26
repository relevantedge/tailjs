const original = require("react");
const { updateConfig } = require("./visit.js");
const { createElement } = original;
const { visit } = require("./bootstrap.js");
const { TrackingBoundary } = require("./TrackingBoundary.js");

module.exports = {
  ...original,
  createElement(type, props, ...children) {
    return visit(createElement, createElement(type, props, ...children));
  },
  updateConfig,
  TrackingBoundary,
  __original: original,
};
