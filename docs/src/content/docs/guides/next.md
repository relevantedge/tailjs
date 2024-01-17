---
title: Next.js
sidebar: { order: 8 }
---

This intgration enables you to run tail.js in a Next.js solution.
When the package is configured, tail.js will very conveniently be deployed with the rest of your solution without any additional steps.
(for example if you are using Vercel for hosting).
T

```sh
# or npm or yarn
pnpm add @tailjs/next
```

Next you add an API route with the code below

```ts title="/src/pages/api/t.js.ts"
import { tailjs } from "@tailjs/next";

export default tailjs({
  // This is important to change if you have named the API end-point
  // to something different than the default.
  endpoint: "/api/t.js",
  // Additional options.
});
```

Assuming you are using React you must also update your `/src/pages/_app.ts` to wrap everything in a `Tracker` component.

```jsx title="src/pages/_app.ts" ins={3,5}
export default function App(Component) {
  // Your other global tags...
  <Tracker>
    <Component />
  </Tracker>;
  // ...
}
```

And that is it.
