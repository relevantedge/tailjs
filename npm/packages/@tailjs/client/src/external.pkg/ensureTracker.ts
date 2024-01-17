import type { EmbeddedTrackerConfiguration } from ".";
import type { Tracker } from "..";
import { trackerConfig, isTracker } from "../lib/config";

const externalConfig = trackerConfig as EmbeddedTrackerConfiguration;

const initialName = trackerConfig.name;
export let tail: Tracker = (globalThis[initialName] ??= []);
let initialized = false;

tail.push((tracker) => (tail = tracker));

// Give consumer a short chance to call configureTracker, before wiring.
// Do it explicitly with Promise instead of async to avoid, say, babel to miss the point.
Promise.resolve(0).then(() => ensureTracker());

async function ensureTracker(): Promise<void> {
  if (trackerConfig.name !== initialName) {
    tail = globalThis[trackerConfig.name] = globalThis[initialName];
    delete globalThis[initialName];
  }
  if (
    typeof window === "undefined" ||
    tail[isTracker] ||
    externalConfig.external ||
    initialized === (initialized = true)
  ) {
    return;
  }

  initialized = true;

  if (trackerConfig.disabled) {
    return;
  }

  //tail.push({ config: trackerConfig });

  const injectScript = () => {
    const src = [trackerConfig.src];
    src.push("?", globalThis.REVISION ?? "");
    if (trackerConfig.name) {
      src.push("#", trackerConfig.name);
    }
    return document.head.appendChild(
      Object.assign(document.createElement("script"), {
        id: "tailjs",
        src: src.join(""),
        async: true,
      })
    );
  };

  document.readyState !== "loading"
    ? injectScript()
    : document.addEventListener(
        "readystatechange",
        () => document.readyState !== "loading" && injectScript()
      );
}
