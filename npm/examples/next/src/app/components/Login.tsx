"use client";

import { useEffect, useRef, useState } from "react";
import { login } from "./actions";
import { useTrackerVariable } from "@tailjs/react";
import type { SessionInfo } from "@tailjs/types";

export const Login = () => {
  const [user, setUser] = useState("test-user");

  const [sessionInfo, , refresh] = useTrackerVariable<SessionInfo>({
    key: "@info",
    scope: "session",
  });

  return (
    <>
      <div>Current user: {sessionInfo?.value?.userId}</div>
      <div>
        <label>
          Impersonate user name
          <input
            type="text"
            className="text-black block"
            value={user}
            onChange={(ev) => setUser(ev.target.value)}
          />
        </label>
      </div>
      <div>
        <button
          onClick={async () => {
            console.log("Login response: ", await login(user));
            await refresh();
          }}
        >
          Login
        </button>
      </div>
    </>
  );
};
