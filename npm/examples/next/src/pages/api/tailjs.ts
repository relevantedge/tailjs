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
import { api } from "@tailjs/next";
import { addTailJsConfiguration } from "@tailjs/node";

addTailJsConfiguration(import("../../../tailjs.config"));

export default api;
