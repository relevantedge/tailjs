const original = require("react/jsx-runtime");
const { visit } = require("./visit.js");
const { jsx, jsxs } = original;
require("./bootstrap.js");

module.exports = {
  ...original,
  jsx(type, props, key) {
    const updated = visit("jsx", type, props);
    return updated
      ? jsx(updated.type, updated.props, key)
      : jsx(type, props, key);
  },
  jsxs(type, props, key) {
    const updated = visit("jsxs", type, props);
    return updated
      ? jsxs(updated.type, updated.props, key)
      : jsxs(type, props, key);
  },
};
