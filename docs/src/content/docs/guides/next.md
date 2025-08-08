---
title: Next.js
sidebar: { order: 8 }
---

This integration enables you to run tail.js in a Next.js solution.
When the package is configured, tail.js will conveniently be deployed with the rest of your solution without any additional steps (for example if you are using Vercel for hosting).

### Installation

To get started add the @tailjs/next and @tailjs/react packages to your project, 
and then use the CLI to bootstrap the configuration files and API route.

```sh

# or npm or yarn

pnpm add @tailjs/next @tailjs/react

# This will initialize the required configuration files and routing.

npx tailjs-next-init

```

### Configure Next.js to use the tail.js plugin.

tail.js uses a webpack plugin to track components, so you will also need to update your `next.config` like the below.
 (The example assumes your config file is in typescript)

:::note
tail.js does currently not support Turbopack (which is the default in Next 15's dev mode).
:::

```ts title="/next.config.ts"
import { TailJsPlugin } from "@tailjs/react/webpack"; 
import type { NextConfig } from "next"; 

const nextConfig: NextConfig = {
  // ... Your existing configuration here.

  webpack: (config) => {

    // ...Your existing webpack configuration (if any).

    // The TailJsPlugin must be the _last_ plugin.    
    config.plugins = [...(config.plugins ?? []), new TailJsPlugin()];
    return config;

  }, 

  // ... More of your existing configuration here.

}; 

export default nextConfig; 

```

### Migration from versions before 0.40

Previously, wrapper components were required (the `ConfiguredTracker` components in `/src/app/api/tailjs` ). Please remove those (including where they are used).

If you have custom mapping logic in `tailjs.client.config.ts` please also note that the signature for the `map` function has changed to:

```ts
(currentState: State | undefined, type: ElementType, props: Record<string, any>) => State | null | undefined | void.
```
