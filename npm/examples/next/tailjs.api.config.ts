import { createApi } from "@tailjs/next/server";
import { RavenDbExtension } from "@tailjs/ravendb";

let ravenDb = null;
import { connection } from "../../packages/@tailjs/ravendb/tests/connection.local";
ravenDb = new RavenDbExtension(connection);

export default createApi({
  debugScript: true, // Useful to see what is going on, once first installed.
  extensions: [ravenDb],
  json: true,
});
