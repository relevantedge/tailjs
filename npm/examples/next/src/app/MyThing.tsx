"use client";

import { ConfiguredTracker } from "./api/tailjs/ConfiguredTracker";

export default () => {
  return (
    <ConfiguredTracker>
      <div>
        A thing<button>Click me!</button>
      </div>
    </ConfiguredTracker>
  );
};
