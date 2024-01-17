import { tail } from "@tailjs/client/external";
import { useRef, useState } from "react";

export function useTrackerVariable<T = any>(name: string, poll = true) {
  let [currentValue, setValue] = useState<T>();
  const loadOnce = useRef(false);
  if (!loadOnce.current) {
    tail.push({
      get: {
        [name](value) {
          if (value != undefined) {
            currentValue = value;
          }
          if (loadOnce.current) {
            // If the get method returns immediately it the tracker has a current value, and we do not want to refresh the component by setting the state.
            setValue(value);
          }
          return poll;
        },
      },
    });
    loadOnce.current = true;
  }
  return [
    currentValue,
    (value: T) => tail.push({ set: { [name]: value } }),
  ] as const;
}
