const original = require("react/jsx-runtime");
const { visit } = require("./bootstrap.js");
const { jsx, jsxs } = original;

module.exports = {
  ...original,
  jsx(type, props, key) {
    // jsxs used as factory because that is the one that assumes static children.
    return visit(jsx, jsx(type, props, key));
  },
  jsxs(type, props, key) {
    return visit(jsx, jsxs(type, props, key));
  },
};
