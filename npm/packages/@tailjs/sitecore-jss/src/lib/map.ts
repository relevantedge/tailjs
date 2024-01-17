import { LayoutServiceData } from "@sitecore-jss/sitecore-jss-nextjs";
import { ExternalReference } from "@tailjs/types";

export const getRouteItem = (
  layoutData?: LayoutServiceData
): ExternalReference | undefined => {
  const page = layoutData?.sitecore?.route;
  return page?.itemId
    ? {
        id: page.itemId,
        name: page.name,
        language: page.itemLanguage,
        version: "" + page.itemVersion,
        source: "sitecore",
      }
    : undefined;
};
