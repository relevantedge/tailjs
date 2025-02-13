import { InMemoryStorage } from "../src";
import { storageTests } from "./variableStorageTests";

storageTests.storageFactory = () => new InMemoryStorage();
describe("MemoryStorage", () => {
  it("CRUDs", async () => await storageTests.tests.crud());
  it("Respects TTL", async () => await storageTests.tests.ttl());
  it("Queries", async () => await storageTests.tests.query());
});
