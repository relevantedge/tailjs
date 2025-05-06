const domServer = require("react-server-dom-webpack/server.browser");
const { wrapDomServer } = require("../wrap-jsx-dom-server.jss");
module.exports = wrapDomServer(domServer);
