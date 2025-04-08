import { createApi } from "@tailjs/next/server";
import { DefaultLogger } from "@tailjs/node";
import { CosmosDbExtension } from "@tailjs/cosmosdb";

let cosmosDb: CosmosDbExtension | undefined;
if (process.env.COSMOS_ENDPOINT) {
  cosmosDb = new CosmosDbExtension({
    endpoint: process.env.COSMOS_ENDPOINT!,
    key: process.env.COSMOS_KEY!,
    database: process.env.COSMOS_DATABASE!,
  });
} else {
  console.error(
    "Environment variables for Cosmos DB not found. Tracked data is not stored."
  );
}

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
