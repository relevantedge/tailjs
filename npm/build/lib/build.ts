import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { RollupOptions, rollup, watch } from "rollup";
import { arg, pack, env } from ".";

export type BuildOptions = {
  export?: boolean;
  buildStart?(): Promise<void>;
  buildEnd?(): Promise<void>;
};

export const build = async (
  options: RollupOptions[],
  { export: exportScripts = true, buildStart, buildEnd }: BuildOptions = {}
) => {
  const pkg = await env();

  const buildEndActions: ((() => void | Promise<void>) | undefined)[] = [
    buildEnd,
  ];

  if (pkg.externalTargets.length && exportScripts) {
    buildEndActions.push(async () => {
      const pkg = await env();
      const src = "./dist/es/index.mjs";
      if (fs.existsSync(src)) {
        for (const target of pkg.externalTargets) {
          if (!fs.existsSync(target)) {
            console.warn(`External target '${target}' does not exist.`);
            continue;
          }
          const targetFile = path.join(target, pkg.name + ".js");
          await fs.promises.copyFile(src, targetFile);
          console.log(`Copied the external script to '${targetFile}'.`);
        }
      }
    });
  }

  exportScripts && buildEndActions.push(() => pack(pkg));

  const watchMode = arg("-w", "--watch");

  let script = arg("-c", "--cli")?.trim();
  if (script) {
    exportScripts &&
      buildEndActions.push(async () => {
        if (!script) return;
        console.log(`Running script '${script}'.`);

        spawn(
          `${
            watchMode ? "pnpm nodemon -e js,cjs,mjs" : "node"
          } "./dist/cli/${script}.cjs"`,
          {
            stdio: "inherit",
            shell: true,
          }
        );
        script = undefined;
      });
  }

  buildEnd = async () => {
    for (const action of buildEndActions) {
      await action?.();
    }
  };

  let pending = 0;
  await Promise.all(
    options.map(async (config, i) => {
      if (!config.output) return;

      const isTypes = (config.plugins as any)?.some(
        (plugin: any) => plugin.name === "dts"
      );
      if (
        isTypes &&
        ((false && watchMode && !arg("-t", "--dts")) || arg("-T", "--no-dts"))
      ) {
        return;
      }

      const outputs = Array.isArray(config.output)
        ? config.output
        : [config.output];

      if (i === 0 && config.output?.[0].dir === "dist" && arg("--clean")) {
        try {
          fs.rmSync("dist", { recursive: true });
        } catch (e) {
          console.warn("Could not clean existing dist directory.");
        }
      }

      const buildName = `${config.input}${isTypes ? ` (types)` : ""} -> ${
        outputs[0].dir
          ? path.relative(process.cwd(), outputs[0].dir)
          : "(unknown)"
      }`;

      config = {
        ...config,
        onwarn: (warning, warn) => {
          if (
            ["CIRCULAR_DEPENDENCY", "UNRESOLVED_IMPORT", "EVAL"].includes(
              warning.code!
            )
          ) {
            return;
          }
          warn(warning);
        },
      };

      console.log(`Build ${buildName} started.`);
      if (watchMode) {
        let resolve: any;
        const waitForFirstBuild = new Promise((r) => (resolve = r));
        const watcher = watch(config);
        watcher.on("event", async (ev) => {
          if (ev.code === "START") {
            !pending++ && (await buildStart?.());

            console.log(`Build started. ${config.input}`);
          } else if (ev.code === "ERROR") {
            console.log("ERROR", ev.error.cause || ev.error);
          } else if (ev.code === "BUNDLE_END") {
            ev.result?.close();
          } else if (ev.code === "END") {
            console.log(`Build ${buildName} completed.`);
            !--pending && (await buildEnd?.());

            resolve();
          }
        });

        await waitForFirstBuild;
      } else {
        if (!pending++) {
          await buildStart?.();
        }
        const bundle = await rollup(config);
        await Promise.all(outputs.map((output) => bundle.write(output)));
        console.log(`Build ${buildName} completed.`);
        if (!--pending) {
          await buildEnd?.();
        }
      }
    })
  );
};
