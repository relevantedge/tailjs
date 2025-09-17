import { UserAgentEvent, UserAgentLanguage } from "@tailjs/types";
import { map } from "@tailjs/util";
import { Tracker, currentViewEvent, detectDeviceType } from "..";

export const postUserAgentEvent = (tracker: Tracker) =>
  tracker({
    type: "user_agent",
    hasTouch: navigator.maxTouchPoints > 0,
    userAgent: navigator.userAgent,
    view: currentViewEvent?.clientId,
    languages: map(navigator.languages, (id, i) => {
      const [language, region] = id.split("-");
      return {
        id,
        language,
        region,
        primary: i === 0,
        preference: i + 1,
      } satisfies UserAgentLanguage;
    }),
    timezone: {
      iana: Intl.DateTimeFormat().resolvedOptions().timeZone,
      offset: new Date().getTimezoneOffset(),
    },
    webdriver: navigator.webdriver,
    ...detectDeviceType(),
  } satisfies UserAgentEvent);
