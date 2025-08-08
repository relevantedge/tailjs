import { DefaultLogger } from "@tailjs/node";
import { ConsoleLogger, createApi } from "@tailjs/next/server";

export default createApi({
  debugScript: true, // Useful to see what is going on, once first installed (DISABLE IN PRODUCTION)
  json: true, // Useful to see what is sent to the server. If false, all communication is encrypted. (DISABLE IN PRODUCTION)
  extensions: [], //[new ConsoleLogger()], // Add extensions here to store data etc.
  logger: new DefaultLogger({
    basePath: false,
    console: "error",
  }),
  resourcesPath: "./tmp",
});
