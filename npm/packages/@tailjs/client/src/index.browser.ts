import { INITIALIZE_TRACKER_FUNCTION } from "@constants";
import { initializeTracker } from "./initializeTracker";
import { define, window } from "./lib2";
import { attach } from "./pusher";

// This assumes the script is loaded from the RequestHandler's ?cfg route.

// To prevent external scripts from eaves-dropping and get a hold of the storage key, this is how initialization works:
// 1: The configuration scripts appends a <script> element with this script, and adds a "loaded" handler.
// 2: This script defines a non-configurable method on the window. This prevents it from being overridden if something intercepts the "loaded" handler before the configuration script.
// 3: The configuration script calls this function with a callback that initializes the tracker with the configuration including the storage key.

window[INITIALIZE_TRACKER_FUNCTION] = (callback: any) => {
  callback(initializeTracker);
};
