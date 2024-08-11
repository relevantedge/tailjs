import React from "react";
import { Button, NextUIProvider } from "@nextui-org/react";
import { Tracker } from "@tailjs/react";

import { configureTracker, tail } from "@tailjs/client/external";

import preactLogo from "./assets/preact.svg";
import "./style.css";

configureTracker((config) => {
  return config;
});

export function App() {
  return (
    <NextUIProvider>
      <Tracker
        disabled={false}
        trackReactComponents={true}
        map={(el, ctx) => {
          // if (el.props?.color === "primary") {
          //   return {
          //     component: { id: "TEST!" },
          //   };
          // }
          // if (el.type === "button" && el.props?.color === "primary") {
          //   console.log("Nosso!!!");
          // }
        }}
      >
        <div track-tags={{ tag: "test", value: "yes", score: 0.5 }}>
          <a href="https://preactjs.com" target="_blank">
            <img src={preactLogo} alt="Preact logo" height="160" width="160" />
          </a>
          <h1>Get Started building Vite-powered Preact Apps </h1>
          <form>
            <input type="text" name="test-text" />
            <input type="checkbox" name="test-boolean" />
          </form>

          <Button
            onClick={() => {
              tail({
                consent: {
                  set: {
                    level: "anonymous",
                    purposes: "any",
                  },
                },
              });
            }}
            color="primary"
          >
            Go private
          </Button>

          <Button
            onClick={() => {
              tail({
                consent: {
                  set: {
                    level: "indirect",
                    purposes: "any",
                  },
                },
              });
            }}
            color="primary"
          >
            Go public
          </Button>
          <Button>A button</Button>
          <section>
            <Resource
              title="Learn Preact"
              description="If you're new to Preact, try the interactive tutorial to learn important concepts"
              href="https://preactjs.com/tutorial"
            />
            <Resource
              title="Differences to React"
              description="If you're coming from React, you may want to check out our docs to see where Preact differs"
              href="https://preactjs.com/guide/v10/differences-to-react"
            />
            <Resource
              title="Learn Vite"
              description="To learn more about Vite and how you can customize it to fit your needs, take a look at their excellent documentation"
              href="https://vitejs.dev"
            />
          </section>
        </div>
      </Tracker>
    </NextUIProvider>
  );
}

function Resource(props) {
  return (
    <a href={props.href} target="_blank" className="resource">
      <h2>{props.title}</h2>
      <p>{props.description}</p>
    </a>
  );
}
