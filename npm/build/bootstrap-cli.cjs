const Module = require("module");
const path = require("path");
const wrapped = Module._load;
const basePath = path.resolve(module.path + "/../packages").replace(/\\/g, "/");

if (!process.argv[2]) {
  console.error("Please specify script.");
  return;
}

Module._load = (...args) => {
  if (args[0].match(/^@tailjs\//)) {
    const segments = args[0].split("/");

    args[0] =
      basePath +
      "/" +
      segments
        .map((segment, i) => (i === 1 ? segment + "/dist" : segment))
        .join("/");
  }

  // let name = args[0];
  // if (name.match(/^@tailjs\//)) {
  //   const segments = name.split("/");

  //   args[0] = segments
  //     .map((name, i) => (i !== 0 && i < 2 ? name + "/dist" : name))
  //     .join("/");
  // }
  return wrapped.apply(Module, args);
};

const script = process.argv.splice(2, 1)[0];
require(path.resolve(process.cwd(), script));
