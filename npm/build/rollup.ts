import { getDistBundles } from "./rollup-dist";
import { build } from "./shared";

await build(await getDistBundles());
