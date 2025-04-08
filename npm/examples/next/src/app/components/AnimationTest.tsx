"use client";
import { motion } from "framer-motion";
import React, { createContext, lazy, Suspense, useState } from "react";

const ThemeContext = createContext("light");

export function InputTest() {
  return <input type="text" />;
}
let n = 0;
export function MotionComponent({
  isVisible,
  text,
}: {
  isVisible: boolean;
  text: string;
}) {
  const [half, setHalf] = useState(false);
  return (
    <motion.div animate={{ opacity: isVisible ? (half ? 0.5 : 1) : 0 }}>
      <span
        className="bg-pink-600"
        suppressHydrationWarning
      >{`${text}: ${n++}`}</span>
      <span
        dangerouslySetInnerHTML={{
          __html: "<div style='color:white'><br>Hello gelloo</div>",
        }}
      />
      <button
        className={half ? "bg-purple-500" : "bg-orange-500"}
        onClick={() => setHalf(!half)}
      >
        Half
      </button>
      <MotionContextComponent isVisible={isVisible} nest={true} />
    </motion.div>
  );
}

export function MotionContextComponent({
  isVisible,
  nest,
}: {
  isVisible: boolean;
  nest: boolean;
}) {
  return (
    <ThemeContext.Consumer>
      {(value) => (
        <motion.div
          animate={{
            translateX: isVisible ? 100 : 0,
            transition: {
              ease: "linear",
              duration: 1,
              delay: 0.2,
            },
          }}
          className="bg-green-500 text-white"
        >
          {nest && (
            <MotionContextComponent isVisible={isVisible} nest={false} />
          )}
          {value}
        </motion.div>
      )}
    </ThemeContext.Consumer>
  );
}

export const Gazonk = lazy(() => import("./Deferred"));

export function SimpleTest({ text }: { text: string }) {
  return text;
}

export function MotionTest() {
  const [state, updateState] = useState({ visible: true, n: 1 });

  return (
    <>
      <MotionComponent isVisible={state.visible} />
      <button
        onClick={(e) => updateState({ ...state, visible: !state.visible })}
        className="bg-pink-600"
      >
        Toggle
      </button>

      <button
        onClick={(e) => updateState({ ...state, n: state.n + 1 })}
        className="bg-blue-500"
      >
        One more
      </button>
      <ThemeContext.Provider value={`There are ${state.n} items.`}>
        {[...Array(state.n).keys()].map((i) => (
          <MotionComponent
            key={i}
            isVisible={state.visible}
            text={`Item${i}`}
          />
        ))}
      </ThemeContext.Provider>
      <div>
        Lazies:
        <Gazonk />
        <Suspense>
          <Gazonk />
        </Suspense>
      </div>
    </>
  );
}
