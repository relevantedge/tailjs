# @tailjs/\* packages

This repository is a monorepo for all the @tailjs/\* packages.
For this it is using [pnpm](https://pnpm.io/) (not npm) - and so do you if you want to work with the source code.

### Installation:

`pnpm -r install`

### Build

`pnpm build` \
`pnpm doc` for type documentation. \
`pnpm --filter @tailjs/react build` for a single/select packages ([see pnpm docs](https://pnpm.io/filtering) for options).

It uses [rollup](https://rollupjs.org/) for all libraries to bundle single files for cjs and es modules respectively together with a d.ts file for TypeScript. In this way no internals are leaked to add confusion in the published packages.

The build process is somewhat customized, and all packages are using the shared build scripts from the `/build` directory. In particular a custom convention is used for "sub packages" where directories called `something`**.pkg** will get their own package.json and bundles in the published npm package.

For example `@tailjs/client` has the sub directory `packages/@tailjs/client/src/external.pkg`.
When a user installs the package via `(p?npm|yarn) add @tailjs/client` the two imports `import @tailjs/client` and `import @tailjs/client/external` becomes available.

This design is chosen because each package comes in different "flavors" for e.g. native node.js use and a polyfilled script that can run directly in an unmodified V8 engine from elsewhere.

You will also find that the build script can feed the package through itself so packages like `@tailjs/engine` can use a string literal containing the minified version of `@tailjs/client` from `@tailjs/client/script` as an embedded resource governed by npm versioning.

### Local development

It may be convenient to hack this project in the context of another website project that uses the tracker. For this you can add the path(s) to such projects in `.env.local` as:

```
PROJECT_[name of project 1]=[path to project 1]
PROJECT_[name of project 2]=[path to project 2]
...
```

This goes well with `pnpm build:watch`.
The build script behaves differently depending on what it finds in the referenced path.

- If the path ends with `/node_modules` it will copy all the packages to it as if they had been installed in the external project
- If the path points to a directory containing `node_modules` if will assume there also is a `src` folder and copy the packages there. This is especially convenient with something that uses hot reloading (e.g. Next.js) since changes in `node_modules` are not watched. Remember to include `"compilerOptions": {... "paths": "@tailjs/*": ["src/@tailjs/*"] ... } }` in your `tsconfig.json` for this to work whilst debugging. Remove all that and use the actually packages when building for prod.
- In all other cases it copies the client scripts to a folder called `res` (to be included in your website markup) and the engine to `engine` (to be loaded from some server code).

### Code style in client project.

The client script is written for compressibility rather than readability (it should not be that though). It even goes to lengths such as "aliasing" `document`, `window`, `undefined`, `null` (as `nil`), `true/false` (as `T/F`) and mangleable versions of e.g. `Array.map`. This is not difficult to maintain but gives a rush of joy every time you see the humble size of the Brotli compressed script sent to the client.
