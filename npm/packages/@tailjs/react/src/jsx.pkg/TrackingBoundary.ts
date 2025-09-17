"use client";

import { ExtendedTrackingBoundaryData } from "@tailjs/types";
import React from "react";

const validateFiber = (fiber: any) => {
  if (!fiber) {
    console.error(
      "The component does not have a fiber (React breaking change?)."
    );
    return false;
  }

  return true;
};

let visitModule: any;
const resolveVisitModule = () =>
  (visitModule ??= require("./bootstrap.js").bootstrap());

const bindFiberState = (fiber: any, state: any) =>
  state &&
  findRelatedDomNodes(fiber).forEach((element) =>
    resolveVisitModule().bindState(element, state)
  );

export const mapChildComponentState = (fiber: any) => {
  if (!validateFiber(fiber)) {
    return;
  }
  const wrappedComponent = fiber.child;
  if (wrappedComponent?.type) {
    bindFiberState(
      wrappedComponent,
      resolveVisitModule().getStateFromProps(
        wrappedComponent.type,
        wrappedComponent.memoizedProps ?? {}
      )
    );
  }
};

const findRelatedDomNodes = (fiber: any) => {
  const collected: any = [];
  if (!validateFiber(fiber)) {
    return collected;
  }
  collectedRelatedTreeDomNodes(fiber, true, collected);
  if (fiber.alternate) {
    // The alternate (supposedly, work-in-progress) tree may sometimes contain the current dom nodes.
    // Scan that too.
    collectedRelatedTreeDomNodes(fiber.alternate, true, collected);
  }
  return collected;
};

const collectedRelatedTreeDomNodes = (
  fiber: any,
  root = true,
  collected: any[]
) => {
  if (fiber.stateNode?.nodeType === 1 && fiber.stateNode.isConnected) {
    collected.push(fiber.stateNode);
  } else if (fiber.child) {
    collectedRelatedTreeDomNodes(fiber.child, false, collected);
  }

  if (!root && fiber.sibling) {
    collectedRelatedTreeDomNodes(fiber.sibling, false, collected);
  }
  return collected;
};

export interface TrackingBoundaryProps {
  children: any;
  state?: ExtendedTrackingBoundaryData; // undefined means "probe lazy rendered child component from react.child.reference".
}
export class TrackingBoundary extends React.Component<TrackingBoundaryProps> {
  constructor(props: any) {
    super(props);
  }

  render(): React.ReactNode {
    return this.props.children;
  }

  _bindState() {
    if (!this.props.state) {
      mapChildComponentState((this as any)?._reactInternals);
    } else {
      bindFiberState((this as any)?._reactInternals, this.props.state);
    }
  }

  componentDidMount(): void {
    this._bindState();
  }

  componentDidUpdate(): void {
    this._bindState();
  }
}

export type TrackingBoundaryType = typeof TrackingBoundary;
