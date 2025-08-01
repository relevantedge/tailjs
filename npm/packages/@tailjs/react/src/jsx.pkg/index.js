const original = require("react");
const { updateConfig } = require("./visit.js");
const { createElement } = original;
const { visit } = require("./bootstrap.js");
const { TrackingBoundary } = require("./TrackingBoundary.js");

const factory = (type, props, key) =>
  createElement(type, key != null ? { ...props, key } : props);

module.exports = {
  ...original,
  createElement(type, props, ...children) {
    const updated = visit(factory, type, props, children);

    return updated
      ? createElement(
          updated.type,
          props?.key && !updated.props?.key
            ? { ...updated.props, key: props.key }
            : updated.props
        )
      : createElement(type, props, ...children);
  },
  updateConfig,
  TrackingBoundary,
  __original: original,
};
