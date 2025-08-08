// import { jest } from "@jest/globals";
import { RavenDbVariableStorage } from "../src";
import { connection as connectionSettings } from "./connection.local";

import { setupStorageTests } from "../../engine/tests/variableStorageTests";
describe("RavenDbVariableStorage", () => {
  setupStorageTests(() => new RavenDbVariableStorage(connectionSettings)).run();
});
