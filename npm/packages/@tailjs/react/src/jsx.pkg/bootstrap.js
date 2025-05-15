const { visit, updateConfig } = require("./visit.js");

let configured = false;
exports.visit = (source, type, props, children) => {
  if (!configured) {
    configured = true;
    let trackerConfig = null;

    let configFile = null;
    try {
      configFile = require("/tailjs.client.config");
    } catch (e) {}

    if (configFile) {
      const applyConfig = (configFile) => {
        for (const config of [
          configFile?.config,
          configFile?.["default"],
          configFile,
        ]) {
          if ((trackerConfig = config?.tracker)) {
            break;
          }
        }
        if (!trackerConfig) {
          console.warn("No tracker configuration found.");
        }
        updateConfig((current) => current || trackerConfig);
      };
      if (configFile?.then) {
        configFile.then((configFile) => applyConfig(configFile));
      } else {
        applyConfig(configFile);
      }
    }
  }
  return visit(source, type, props, children);
};
