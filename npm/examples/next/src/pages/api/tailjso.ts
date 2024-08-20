import { createServer } from "@tailjs/next/server";

/* 
 * The API route handler for tail.js.
 * This file is auto-generated and should not be edited directly         
 *
 * You are encouraged, but not required, to add a rewrite to make this
 * endpoint follow standard conventions by merging the bellow settings
 * into your './next.config.mjs' configuration file: 
   
  {    
    env: {
      NEXT_PUBLIC_TAILJS_API: "/_t.js",
    },
    rewrites: () => [
      {
        source: "/_t.js",
        destination: "/api/tailjs",
      },
    ],
  }
 
 */

export default createServer({
  // Tail.js configuration settings
  debugScript: true,
  extensions: [], //new ConsoleLogger()],
});
