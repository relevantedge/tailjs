import { NativeHost } from "@tailjs/node";
import path from "path";
// import { jest } from "@jest/globals";
import { DefaultCryptoProvider, TrackerEnvironment } from "@tailjs/engine";
import { RavenDbVariableStorage } from "../src";
import { connection as connectionSettings } from "./connection.local";

import { storageTests } from "../../engine/tests/variableStorageTests";
describe("RavenDbVariableStorage", () => {
  const host = new NativeHost({ rootPath: connectionSettings.rootPath });
  const env = new TrackerEnvironment(
    host,
    new DefaultCryptoProvider(null),
    null!
  );
  const storageFactory = (storageTests.storageFactory = async () => {
    const storage = new RavenDbVariableStorage(connectionSettings);
    await storage.initialize(env);

    await storage.purge(storageTests.testScopes.map((scope) => ({ scope })));
    return storage;
  });

  it("Cruds", async () => await storageTests.tests.crud());
  it("Queries", async () => await storageTests.tests.query());
  it("TTLs", async () => await storageTests.tests.ttl());

  afterEach(async () => await storageFactory());
});
