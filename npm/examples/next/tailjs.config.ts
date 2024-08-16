import { TailJsApiConfiguration, TailJsConsoleLogger } from "@tailjs/next";

export default async (): Promise<TailJsApiConfiguration> => ({
  // Tail.js configuration settings
  debugScript: true,
  extensions: [new TailJsConsoleLogger()],
});
