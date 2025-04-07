import { createApi } from "@tailjs/next/server";
// import { RavenDbExtension } from "@tailjs/ravendb";
import { DefaultLogger } from "@tailjs/node";
import { CosmosDbExtension } from "@tailjs/cosmosdb";

// let ravenDb = null;
// import { connection } from "../../packages/@tailjs/ravendb/tests/connection.local";
// ravenDb = new RavenDbExtension({
//   ...connection,
//   x509: {
//     cert: process.env.RAVENDB_CERT!,
//     key: process.env.RAVENDB_KEY,
//   },
// });

import { cosmosSettings } from "./cosmos.local";
const cosmosDb = new CosmosDbExtension(cosmosSettings);

export default createApi({
  debugScript: true,
  json: true,
  extensions: [cosmosDb],

  logger: new DefaultLogger({
    basePath: false,
    console: "error",
  }),
  resourcesPath: "./tmp",
});
