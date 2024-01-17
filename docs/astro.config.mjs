import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
      title: "tail.js",
      logo: {
        src: "./src/assets/logo.svg",
        alt: "tail.js",
        replacesTitle: true,
      },
      social: {
        github: "https://github.com/relevantedge/tailjs",
      },
      customCss: ["./src/styles/overrides.css"],
      sidebar: [
        {
          label: "Overview",
          autogenerate: { directory: "overview" },
        },
        {
          label: "Guides",
          autogenerate: { directory: "guides" },
        },
        // {
        //   label: "Reference",
        //   autogenerate: { directory: "reference" },
        // },
      ],
    }),
  ],
});
