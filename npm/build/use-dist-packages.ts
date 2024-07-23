import path from "path";
const basePath = path.resolve(__dirname + "/../packages").replace(/\\/g, "/");

export const mapModuleName = (name: string) => {
  if (name.match(/^@tailjs\//)) {
    const segments = name.split("/");

    return segments
      .map((name, i) => (i !== 0 && i < 2 ? name + "/dist" : name))
      .join("/");
  }
  return name;
};
