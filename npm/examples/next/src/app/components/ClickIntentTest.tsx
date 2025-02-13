"use client";
import React from "react";

export const ClickIntentTest = ({ test }: { test?: string } = {}) => {
  return (
    <div className="p-6">
      <button>See if you can hit me.</button>
    </div>
  );
};
