import { pathsToModuleNameMapper } from "ts-jest";
const { compilerOptions } = require("./tsconfig");

export default {
  preset: "ts-jest/presets/default-esm",
  //verbose: true,
  transform: { "^.+\\.ts?$": ["ts-jest", { useESM: true }] },
  testEnvironment: "node",
  testRegex: "/packages/.*/tests/.*\\.(test|spec)?\\.(ts|tsx)$",
  // moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  modulePathIgnorePatterns: ["dist"],

  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
    prefix: "<rootDir>/",
  }),
};
