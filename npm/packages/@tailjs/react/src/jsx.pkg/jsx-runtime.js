const original = require("react/jsx-runtime");
const { visit } = require("./bootstrap.js");
const { jsx, jsxs } = original;

module.exports = {
  ...original,
  jsx(type, props, key) {
    const updated = visit(jsx, type, props);
    return updated
      ? jsx(updated.type, updated.props, key)
      : jsx(type, props, key);
  },
  jsxs(type, props, key) {
    const updated = visit(jsxs, type, props);
    return updated
      ? jsxs(updated.type, updated.props, key)
      : jsxs(type, props, key);
  },
};
