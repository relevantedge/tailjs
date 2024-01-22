import { MUTEX_REQUEST_COOKIE, MUTEX_RESPONSE_COOKIE } from "@constants";
import { EncodableObject } from "@tailjs/util/transport";
import {
  F,
  T,
  createChannel,
  debug,
  decompose,
  eventSet,
  formatDuration,
  isForegroundTab,
  nil,
  now,
  promise,
  registerStartupHandler,
  // cookies,
  secureCookies,
  timeout,
  trackerConfig,
  tryCatch,
} from ".";

const cookies = secureCookies;

// If a post has not completed within this threshold concurrent posting may happen.
const ACTIVE_REQUEST_POLL = 25;
const PASSIVE_REQUEST_POLL = 500;

const [addResponseListener, callResponseHandlers] =
  eventSet<[affinity: string, variables: EncodableObject]>();

export { addResponseListener };

const responseChannel = createChannel<true | { error: any }>("req");

const checkResponseCookie = () => {
  return (
    tryCatch(() =>
      decompose(
        cookies<
          [string, [string, number], string | undefined, EncodableObject]
        >(MUTEX_RESPONSE_COOKIE),
        (affinity, source, error, variables) => (
          cookies(MUTEX_RESPONSE_COOKIE, nil),
          debug(
            `Got response for ${source?.[0]} after ${
              source?.[1] ? formatDuration(now() - source[1]) : "(unknown)"
            }.`
          ),
          callResponseHandlers(affinity, variables),
          error
            ? (responseChannel({ error }), debug(`Response error: ${error}`))
            : responseChannel(T),
          T
        )
      )
    ) || F
  );
};

const responseTimeout = timeout();

const pollResponseCookie = () => (
  isForegroundTab() && checkResponseCookie(),
  responseTimeout(
    pollResponseCookie,
    cookies(MUTEX_REQUEST_COOKIE) ? ACTIVE_REQUEST_POLL : PASSIVE_REQUEST_POLL
  )
);

registerStartupHandler(() => pollResponseCookie());

export const tryAcquireRequestLock = async (
  force: boolean,
  source: string,
  action: (forced: boolean) => boolean | any
): Promise<boolean> => {
  const sourceLabel = `(${source ?? "(unknown)"})`;
  checkResponseCookie();
  let forced = !!cookies(MUTEX_REQUEST_COOKIE);
  if (!force && forced) {
    debug(`Another request is currently in progress - request cancelled.`);
    return F;
  }
  let t0 = now();
  const cookieValue = [sourceLabel, t0];
  cookies(MUTEX_REQUEST_COOKIE, cookieValue, trackerConfig.requestTimeout);
  cookies(MUTEX_RESPONSE_COOKIE, nil);
  if (action(forced) === F) {
    cookies(MUTEX_REQUEST_COOKIE, nil);
    return T;
  }

  return await promise<boolean>((resolve) =>
    responseChannel((response) => (resolve(response === T), F), T)
  );
};
