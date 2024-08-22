import { ConfiguredTracker, Tracker } from "@tailjs/react";
import Script from "next/script";
import React, { isValidElement } from "react";
import { ClientConfiguration } from ".";

const isClientRef = (el: any) =>
  (el as any)?.type?.$$typeof?.toString() === "Symbol(react.client.reference)";

/**
 * "Bakes" a mapping function into a component that can be used
 * both client and server side without the limitation that functions cannot
 * be passed from server components to client components.
 *
 * To make it work some very specific boilerplate must be used where the
 * the final component that supports both client and server must be exported from
 * a file _without_ "use client" that imports itself from a "use client" file
 * that reexports it.
 *
 * Public component file:
 *
 * ```
 * // file: ConfiguredTracker.ts
 * import client from "./_client";
 * export const ConfiguredTracker = compileTracker(configuration, () => client);
 * ```
 *
 * Helper file for client component. This should be named sufficiently obscurely
 * to avoid anyone from importing the component from this file by accident:
 *
 * ```
 * // file: _client.ts
 * "use client";
 * import { ConfiguredTracker } from "./ConfiguredTracker";
 * export default ConfiguredTracker;
 * ```
 */
export const compileTracker = (
  {
    map,
    endpoint = process.env.NEXT_PUBLIC_TAILJS_API || "/api/tailjs",
    scriptTag: ScriptTag = Script,
  }: ClientConfiguration,
  clientResolver: () => ConfiguredTracker
): ConfiguredTracker => {
  let Client: ConfiguredTracker;

  const mapEl = (el: any, parse: (el: any) => any) =>
    el.props
      ? {
          ...el,
          props: Object.fromEntries(
            Object.entries(el.props).map(([key, value]) => [
              key,
              parseProps(value, parse),
            ])
          ),
        }
      : el;

  const parseProps = (value: any, parse: (el: any) => any) => {
    if (!value || typeof value !== "object") return value;

    if (Array.isArray(value)) {
      return value.map((prop) => parseProps(prop, parse));
    }

    return parse(value);
  };

  const ConfiguredTracker: ConfiguredTracker = (props) => {
    Client ??= clientResolver();

    const clientSide = Client === ConfiguredTracker;

    if (props.clientSide && clientSide) {
      // If we do not have a client component, we are the client.
      return <Client />;
    }

    return (
      <Tracker
        {...{
          map,
          scriptTag:
            props.root !== false ? <ScriptTag src={endpoint} /> : false,
          embedBoundaryData: !clientSide,
          ignore: [ConfiguredTracker, Client],
          children: props.children,
        }}
        parseOverride={(el, parse) => {
          if (el.type === ConfiguredTracker || el.type === Client) return el;

          if (isClientRef(el)) {
            return <Client>{mapEl(el, parse)}</Client>;
          }
        }}
      />
    );
  };

  return ConfiguredTracker;
};
