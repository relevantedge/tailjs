import { INITIALIZE_TRACKER_FUNCTION } from "@constants";
import { initializeTracker } from "./initializeTracker";
import { window } from "./lib2";

// This assumes the script is loaded from the RequestHandler's ?init route.

// To prevent external scripts from eavesdropping by getting a hold of the encryption key, this is how initialization works:
// 1: The configuration script appends a <script> element with this script, and adds a "loaded" handler.
// 2: This script defines a non-configurable method on the window. This prevents it from being overridden if something intercepts the "loaded" handler before the configuration script.
// 3: The configuration script calls this function with a callback that initializes the tracker with the configuration including the storage key.

Object.defineProperty(window, INITIALIZE_TRACKER_FUNCTION, {
  writable: false,
  configurable: false,
  value: (callback: any) => {
    callback(initializeTracker);
  },
});
