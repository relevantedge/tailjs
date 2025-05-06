const domServer = require("react-server-dom-webpack/server.bun");
const { wrapDomServer } = require("../wrap-jsx-dom-server.js");
module.exports = wrapDomServer(domServer);
