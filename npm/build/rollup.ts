import { getDistBundles } from "./rollup-dist";
import { build } from "./lib/build";

await build(await getDistBundles());
