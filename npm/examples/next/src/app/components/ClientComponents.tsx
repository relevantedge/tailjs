"use client";

import React, { useContext, useEffect, useState } from "react";

const TestContext = React.createContext<{
  selected: string[];
  update: (value: string, toggle: boolean) => void;
}>(null!);

export const Test3 = ({ foo }: { foo: string }) => {
  const [a, b] = useState(1);
  useEffect(() => {
    if (a === 1) {
      b(2);
    }
  });
  return (
    <>
      <div>
        Client says hello<button onClick={() => b(a + 1)}>Test 3</button>
        {a}
        {/* <Test5 componentId="Test-5" /> */}
      </div>
    </>
  );
};
Test3.displayName = "Zonk";

const ContextValue = ({ value }: { value: string }) => {
  const ctx = useContext(TestContext);
  const selected = ctx.selected.includes(value);
  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={selected}
          onChange={() => ctx.update(value, !selected)}
        />{" "}
        {value}
      </label>
    </div>
  );
};

export const ContextTest = () => {
  const [values, updateValues] = useState<string[]>(() => []);
  return (
    <TestContext.Provider
      value={{
        selected: values,
        update: (value, toggle) => {
          if (toggle !== values.includes(value)) {
            updateValues(
              toggle
                ? [...values, value]
                : values.filter((other) => other !== value)
            );
          }
        },
      }}
    >
      <form>
        <div>
          {["Test 1", "Test 2", "Test 3"].map((value) => (
            <ContextValue key={value} value={value} />
          ))}
        </div>

        <input type="text" name="firstName" />
        <br />
        <input type="text" name="lastName" />
        <br />
        <input type="submit" value="OK" />
      </form>
    </TestContext.Provider>
  );
};

export const Test5 = (props: { componentId: string }) => {
  return <span>Gazonk</span>;
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
