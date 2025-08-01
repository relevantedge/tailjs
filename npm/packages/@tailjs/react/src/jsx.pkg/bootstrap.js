let configured = false;

const bootstrap = () => {
  const visitModule = require("./visit.js");

  if (configured) {
    return visitModule;
  }

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
      visitModule.updateConfig((current) => current || trackerConfig);
    };
    if (configFile?.then) {
      configFile.then((configFile) => applyConfig(configFile));
    } else {
      applyConfig(configFile);
    }
  }
  return visitModule;
};

exports.bootstrap = bootstrap;
exports.visit = (source, type, props, children) =>
  (exports.visit = bootstrap().visit)(source, type, props, children);
