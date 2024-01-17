import {
  ComponentRendering,
  LayoutServiceData,
  PlaceholdersData,
} from "@sitecore-jss/sitecore-jss-nextjs";
import { ComponentRenderingWithExperiences } from "@sitecore-jss/sitecore-jss/types/personalize/layout-personalizer";
import { Personalization, PersonalizationVariant } from "@tailjs/types";
import { getRouteItem } from "../lib/map";

const p13n = "_tp13n";

export const DEFAULT_VARIANT = "_default";

type P13nTargets = [
  variantId: string,
  uid: string,
  dataSource: string,
  componentName: string
];

type PersonalizationData = P13nTargets[];
export type P13nComponentRendering = ComponentRendering & {
  [p13n]: [component: number, index: number];
};

function mapExperience(
  variantId: string,
  experience: ComponentRendering,
  original: ComponentRenderingWithExperiences
): P13nTargets {
  const get = (aspect: keyof ComponentRenderingWithExperiences) => {
    const value = experience[aspect];
    return value && (experience === original || value !== original[aspect])
      ? value
      : "";
  };

  return [
    variantId,
    experience.uid ?? "",
    get("dataSource"),
    get("componentName"),
  ];
}

function traverse(
  data: PersonalizationData[],
  placeholders: PlaceholdersData | null | undefined
) {
  if (!placeholders) return;
  for (const rendering of Object.entries(placeholders).flatMap(
    ([, renderings]) => renderings as ComponentRenderingWithExperiences[]
  )) {
    const experiences = rendering[
      "experiences"
    ] as Partial<ComponentRenderingWithExperiences>["experiences"];
    if (
      experiences &&
      Object.keys(experiences).some((key) => key !== DEFAULT_VARIANT)
    ) {
      data.push(
        Object.entries({
          ...experiences,
          [DEFAULT_VARIANT]: rendering,
        }).map(([id, experience], i) =>
          mapExperience(
            id,
            ((experience[p13n] = [data.length, i]), experience),
            rendering
          )
        )
      );
    }
    traverse(data, rendering["placeholders"]);
  }
}

export function getPagePersonalization(
  layout: LayoutServiceData
): Personalization[] | undefined {
  const pageVariantId = layout?.sitecore?.context?.variantId as string;
  if (!pageVariantId) return;

  if (pageVariantId !== DEFAULT_VARIANT) {
    return [
      {
        source: getRouteItem(layout),
        variants: [
          {
            id: pageVariantId,
            default: pageVariantId === DEFAULT_VARIANT,
            eligible: true,
            selected: true,
            itemType: "segment",
            source: "sitecore-personalize",
          },
        ],
      },
    ];
  }
}

export function getComponentPersonalization(
  layout: LayoutServiceData,
  rendering: ComponentRendering | null | undefined
): Personalization[] | undefined {
  const indices = rendering?.[p13n];
  if (!indices) return;

  const set = layout[p13n]?.[indices[0]];
  const selected = set?.[indices[1]];
  if (!selected) return;

  const mapChoice = (data: P13nTargets): PersonalizationVariant => {
    const choice: PersonalizationVariant = {
      id: data[0],
      default: data[0] === DEFAULT_VARIANT,
      selected: data === selected,
      eligible: data === selected || data[0] === DEFAULT_VARIANT,
      itemType: "segment",
      source: "sitecore-personalize",
      sources: [
        { personalizationType: "data-source", id: data[2] },
        { personalizationType: "component", id: data[3] },
      ].filter((item) => item.id),
    };
    return choice;
  };

  const personalization: Personalization = {
    source: getRouteItem(layout),
    variants: set.map(mapChoice),
  };

  if (selected[1]) {
    personalization.tags = [`p13n:renderxml:uid=${selected[1]}`];
  }

  return [personalization];
}

class PeronalizePlugin {
  order = 2.5;

  async exec(props: { layoutData: LayoutServiceData }) {
    // Modify layoutData to use specific variant instead of default
    // This will also set the variantId on the Sitecore context so that it is accessible here
    traverse(
      (props.layoutData[p13n] = []),
      props.layoutData?.sitecore?.route?.placeholders
    );

    return props;
  }
}

export const tailFPlugin = new PeronalizePlugin();
