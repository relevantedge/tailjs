import { UserAgentEvent, UserAgentLanguage } from "@tailjs/types";
import { map2, restrict } from "@tailjs/util";
import { Tracker, currentViewEvent, detectDeviceType } from "..";

export const postUserAgentEvent = (tracker: Tracker) =>
  tracker(
    restrict<UserAgentEvent>({
      type: "user_agent",
      hasTouch: navigator.maxTouchPoints > 0,
      userAgent: navigator.userAgent,
      view: currentViewEvent?.clientId,
      languages: map2(navigator.languages, (id, i) => {
        const [language, region] = id.split("-");
        return restrict<UserAgentLanguage>({
          id,
          language,
          region,
          primary: i === 0,
          preference: i + 1,
        });
      }),
      timezone: {
        iana: Intl.DateTimeFormat().resolvedOptions().timeZone,
        offset: new Date().getTimezoneOffset(),
      },
      ...detectDeviceType(),
    })
  );
