import { CosmosDbVariableStorage } from "../src";

import { setupStorageTests } from "../../engine/tests/variableStorageTests";
import { cosmosSettings } from "./connection.local";

describe("CosmosDbVariableStorage", () => {
  setupStorageTests(() => new CosmosDbVariableStorage(cosmosSettings), {
    maxItems: 20,
  }).run();
});
