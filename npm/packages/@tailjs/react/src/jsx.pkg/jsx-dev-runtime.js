const original = require("react/jsx-dev-runtime");
const { visit } = require("./visit.js");
const { jsxDEV } = original;
require("./bootstrap.js");

module.exports = {
  ...original,
  jsxDEV(type, props, key, isStatic, source, self) {
    const updated = visit("jsxDEV", type, props);
    return updated
      ? jsxDEV(updated.type, updated.props, key, isStatic, source, self)
      : jsxDEV(type, props, key, isStatic, source, self);
  },
};
