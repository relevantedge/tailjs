const domServer = require("react-server-dom-webpack/server");
const { wrapDomServer } = require("../wrap-jsx-dom-server.js");
module.exports = wrapDomServer(domServer);
