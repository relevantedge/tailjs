import { ConsoleLogger, createServer } from "@tailjs/next/server";

const { GET, POST } = createServer({
  // Tail.js configuration settings
  debugScript: true,
  extensions: [], //new ConsoleLogger()],
});

export { GET, POST };
