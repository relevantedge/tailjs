import { CLIENT_CALLBACK_CHANNEL_ID } from "@constants";

export const generateClientExternalNavigationScript = (
  requestId: string,
  url: string
) => {
  return `<html><head><script>try{localStorage.setItem(${JSON.stringify(
    CLIENT_CALLBACK_CHANNEL_ID
  )},${JSON.stringify(
    JSON.stringify({ requestId })
  )});localStorage.removeItem(${JSON.stringify(
    CLIENT_CALLBACK_CHANNEL_ID
  )});}catch(e){console.error(e);}location.replace(${JSON.stringify(
    url
  )});</script></head><body>(Redirecting to ${url}...)</body></html>`;
};
