import { NativeHost } from "@tailjs/node";
import path from "path";
// import { jest } from "@jest/globals";
import { DefaultCryptoProvider, TrackerEnvironment } from "@tailjs/engine";
import { RavenDbVariableStorage } from "../src";
import { connection as connectionSettings } from "./connection.local";

import { storageTests } from "../../engine/tests/variableStorageTests";
describe("RavenDbVariableStorage", () => {
  const certPath = connectionSettings.x509?.certPath;
  const certPathParts = certPath
    ? { dir: path.dirname(certPath), file: path.basename(certPath) }
    : undefined;
  const host = new NativeHost({ rootPath: certPathParts?.dir || "." });
  if (certPath) {
    connectionSettings.x509!.certPath = certPathParts!.file;
  }
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
// describe("RavenDbVariableStorage", () => {
//   const certPath = connection.x509?.certPath;
//   const certPathParts = certPath
//     ? { dir: path.dirname(certPath), file: path.basename(certPath) }
//     : undefined;
//   const host = new NativeHost({ rootPath: certPathParts?.dir || "." });
//   if (certPath) {
//     connection.x509!.certPath = certPathParts!.file;
//   }
//   const env = new TrackerEnvironment(
//     host,
//     new DefaultCryptoProvider(null),
//     null!
//   );

//   it("foos", async () => {
//     const variables = new RavenDbVariableStorage(connection);

//     await variables.initialize(env);

//     console.log(
//       await variables.query([{ scope: "session", entityIds: ["1"] }])
//     );
//     // const t0 = now();
//     // let setResponse: any, getResponse: any;

//     // for (let i = 0; i < 10; i++) {
//     //   setResponse = await variables.set([
//     //     {
//     //       scope: "session",
//     //       entityId: "18",
//     //       key: "test",
//     //       value: "hello",
//     //       ttl: 20000,
//     //       force: true,
//     //     },
//     //   ]);

//     //   getResponse = await variables.get([
//     //     { scope: "session", entityId: "1", key: "test" },
//     //     { scope: "session", entityId: "12", key: "test" },
//     //     { scope: "session", entityId: "15", key: "test" },
//     //     { scope: "session", entityId: "2", key: "test" },
//     //   ]);
//     // }

//     // console.log({ elapsed: now() - t0, setResponse, getResponse });
//     // console.log(
//     //   await variables.set([
//     //     {
//     //       scope: "session",
//     //       entityId: "12",
//     //       key: "test",
//     //       value: { coo: true },
//     //       ttl: 10000,
//     //       version: "A:8958-4BxWXVMMkk6p2Z4/J4lhJQ",
//     //       //force: true,
//     //       //ttl: 100000,
//     //       //force: true,
//     //       //version: "",
//     //     },
//     //     // {
//     //     //   scope: "session",
//     //     //   entityId: "9",
//     //     //   key: "test",
//     //     //   value: null,
//     //     //   //force: true,
//     //     //   //ttl: 100000,
//     //     //   version: "",
//     //     // },
//     //     //{ scope: "session", entityId: "4", key: "test", value: { ok: true } },
//     //   ])
//     // );
//   });
// });
