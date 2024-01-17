---
title: Stand-alone and Express.js
sidebar: { order: 8 }
---

This integration can both be used to run the tail.js server engine in a stand-alone server, or add it to an existing Express app.

```sh
# or npm or yarn
pnpm add @tailjs/express
```

### Stand-alone tail.js server

If you want to run the server stand-alone, install the package in some directory, and create a file like below.

```js title="index.js"
const tailjs = require("@tailjs/express");

// "null" can also be a number that specifies the port for the server. (the default is 7411)
tailjs(null /* configuration as per above. */);
```

Then you can start it with

```sh
node index.js
```

### Adding as middleware to existing Express server.

```ts title="index.ts"
import { tailjs } from "@tailjs/express";

const app = express();
// Whatever your existing configuration...

tailjs(app, {
  client: {
    /* Tracker client configuration */
  },
  cookieKeys: [
    /* Keys used for encrypting cookies */
  ],
  extensions: [
    /* Extensions for writing to a database, client IP etc. */
  ],
});
```
