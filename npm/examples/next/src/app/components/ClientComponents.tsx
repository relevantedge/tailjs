"use client";

import React, { useEffect, useState } from "react";

export const Test3 = () => {
  const [a, b] = useState(1);
  useEffect(() => {
    if (a === 1) {
      b(2);
    }
  });
  return (
    <div>
      Client says hello<button>Test 3</button>
      {a}
      <Test5 />
    </div>
  );
};

export const Test5 = () => {
  return <span />;
};

export const Test4 = (props: { componentId: string }) => {
  return (
    <>
      <div>
        Client component {props.componentId}
        <button>Test 4</button>
      </div>
    </>
  );
};
