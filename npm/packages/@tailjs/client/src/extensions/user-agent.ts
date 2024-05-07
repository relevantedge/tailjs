import { map, push, restrict } from "@tailjs/util";
import { Tracker, currentViewEvent, detectDeviceType } from "..";
import { UserAgentEvent } from "@tailjs/types";

export const postUserAgentEvent = (tracker: Tracker) =>
  push(
    tracker,
    restrict<UserAgentEvent>({
      type: "user_agent",
      hasTouch: navigator.maxTouchPoints > 0,
      userAgent: navigator.userAgent,
      view: currentViewEvent?.clientId,
      languages: map(navigator.languages, (id, i, parts = id.split("-")) =>
        restrict<UserAgentEvent["languages"]>({
          id,
          language: parts[0],
          region: parts[1],
          primary: i === 0,
          preference: i + 1,
        })
      ),
      timezone: {
        iana: Intl.DateTimeFormat().resolvedOptions().timeZone,
        offset: new Date().getTimezoneOffset(),
      },
      ...detectDeviceType(),
    })
  );
