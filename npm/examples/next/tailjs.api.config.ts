import { ConsoleLogger, createApi } from "@tailjs/next/server";

export default createApi({
  debugScript: true, // Useful to see what is going on, once first installed.
  extensions: [new ConsoleLogger()], // Add extensions here to store data etc.
});
