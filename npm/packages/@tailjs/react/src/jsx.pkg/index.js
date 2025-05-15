const original = require("react");
const { updateConfig, TrackerBoundary } = require("./visit.js");
const { createElement } = original;
const { visit } = require("./bootstrap.js");

module.exports = {
  ...original,
  createElement(type, props, ...children) {
    const updated = visit("createElement", type, props, children);

    return updated
      ? createElement(updated.type, updated.props)
      : createElement(type, props, ...children);
  },
  updateConfig,
  TrackerBoundary,
};
