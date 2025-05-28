const original = require("react/jsx-dev-runtime");
const { jsx } = require("react/jsx-runtime");
const { visit } = require("./bootstrap.js");
const { jsxDEV } = original;

module.exports = {
  ...original,
  jsxDEV(type, props, key, isStatic, source, self) {
    const updated = visit(jsx, type, props);
    return updated
      ? jsxDEV(updated.type, updated.props, key, isStatic, source, self)
      : jsxDEV(type, props, key, isStatic, source, self);
  },
};
