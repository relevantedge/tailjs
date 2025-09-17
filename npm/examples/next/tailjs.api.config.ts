import { createApi } from "@tailjs/next/server";
import { DefaultLogger } from "@tailjs/node";
import { CosmosDbExtension } from "@tailjs/cosmosdb";
import { ClientLocation } from "@tailjs/maxmind";

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

const maxmind = process.env.GEO_DB_URL
  ? new ClientLocation({
      source: {
        url: process.env.GEO_DB_URL,
      },
    })
  : undefined;

export default createApi({
  debugScript: true,
  json: true,
  extensions: [maxmind, cosmosDb],

  logger: new DefaultLogger({
    basePath: false,
    console: "warn",
  }),

  sessionTimeout: 30,
  resourcesPath: "./tmp",
});
