import { useClientConfiguration } from "@tailjs/next";

export default useClientConfiguration({
  map: (el) => {
    if (el.type === "div") {
      return { component: { id: "test123" } };
    }
  },
});
