const original = require("react/jsx-dev-runtime");
const { visit } = require("./bootstrap.js");
const { jsxDEV } = original;

module.exports = {
  ...original,
  jsxDEV(type, props, key, isStatic, source, self) {
    return visit(jsxDEV, jsxDEV(type, props, key, isStatic, source, self));
  },
};
