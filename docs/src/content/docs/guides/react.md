---
title: React / Preact
sidebar:
  order: 5
---

_More details will be added to this guide soon._

Install the package `@tailjs/react`, and wrap you application in the `<Tracker>` tag.
This will automatically start tracking your pages and clicks on individual React components.
It provides plenty of options to configure exactly which and how.

#### Install package

```shell
# You can obviously also use npm or yarn.
pnpm add @tailjs/react
```

#### Add root tag

```jsx
<Tracker>
  <Router>...etc</Router>
</Tracker>
```

For an elaborate example refer to `@tailjs/sitecore-jss`.

## Backend

You will also need a backend. Install `@tailjs/express` or `@tailjs/next` to your taste and following the instructions for those packages.
(Will be added here).

Note that any platform hosting the engine will do. In the Umbraco example in the git repository .NET is used as the backend for a React frontend.
