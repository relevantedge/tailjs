import { InMemoryStorage } from "../src";
import { setupStorageTests } from "./variableStorageTests";

describe("MemoryStorage", () => {
  setupStorageTests(() => new InMemoryStorage()).run();
});
