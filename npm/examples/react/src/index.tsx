import { App } from "./App";
import { createRoot } from "react-dom/client";

import React from "react";

if ((React as any).render) {
  console.log("Using Preact.");
  // This is Preact. The render function is not part of React.
  (React as any).render(<App />, document.getElementById("app"));
} else {
  console.log("Using React.");
  createRoot(document.getElementById("app")).render(<App />);
}
