"use client";

import React from "react";
import { bindState } from "./visit";

export const findDOMNodes = (fiber: any, collected?: any[]) => {
  let root = collected === undefined;
  collected ??= [];
  if (!fiber) {
    if (root) {
      console.error(
        "The component does not have fiber (React breaking change?)."
      );
    }
    return collected;
  }

  if (fiber.stateNode?.nodeType === 1) {
    collected.push(fiber.stateNode);
  } else if (fiber.child) {
    findDOMNodes(fiber.child, collected);
  }

  if (!root && fiber.sibling) {
    findDOMNodes(fiber.sibling, collected);
  }
  return collected;
};

export class TrackingBoundary extends React.Component<{
  children: any;
  state: any;
}> {
  render(): React.ReactNode {
    return this.props.children;
  }

  componentDidMount(): void {
    //const element = findDOMNode(this);
    for (const element of findDOMNodes((this as any)?._reactInternals)) {
      bindState(element, this.props.state);
    }
  }

  componentDidUpdate(): void {
    this.componentDidMount();
  }
}

export type TrackingBoundaryType = typeof TrackingBoundary;
