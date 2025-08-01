"use client";

import { tail } from "@tailjs/react";

export const FormTest = () => {
  return (
    <form
      onSubmit={(e) => {
        console.log("prevent");
        e.preventDefault();
      }}
    >
      <input style={{ color: "black" }} type="text" name="Test" />
      <button type="submit">OK</button>
      <br />
      <button type="button" onClick={(e) => tail({ form: "submit", ref: e })}>
        Le tail.js commit
      </button>
      <button
        type="button"
        className="cancel"
        onClick={() => tail({ form: "validation-error" })}
      >
        Le tail.js cancel
      </button>
    </form>
  );
};
