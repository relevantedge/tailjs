"use client";
import React, { createContext } from "react";
import { AnimatePresence, cubicBezier, motion } from "framer-motion";
import { useState } from "react";

const ThemeContext = createContext("light");

export function MotionComponent({ isVisible }: { isVisible: boolean }) {
  const [half, setHalf] = useState(false);
  return (
    <div>
      <motion.div animate={{ opacity: isVisible ? (half ? 0.5 : 1) : 0 }}>
        <span className="bg-pink-600">Hello</span>
        <button
          className={half ? "bg-purple-500" : "bg-orange-500"}
          onClick={() => setHalf(!half)}
        >
          Half
        </button>
      </motion.div>
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
            {value}
          </motion.div>
        )}
      </ThemeContext.Consumer>
    </div>
  );
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
        <div>
          {[...Array(state.n).keys()].map((i) => (
            <MotionComponent key={i} isVisible={state.visible} />
          ))}
        </div>
      </ThemeContext.Provider>
    </>
  );
}
