/**
 * Limits or extends how user activations are tracked for components:
 * - `none`: Do not track component clicks. For navigation this is the same as `direct`. \
 * - `auto`: The default level as per configuration (region-direct) or `none` if in a `<nav>` element to avoid excessive tracking of navigation menus, e.g. a burger button.
 * - `context`: Include the full stack of component that contain the activated element. This is the default value
 * - `direct`: Only include the closest component that contains the activated element.
 * - `region-context`: Like `context` and adds the bounding rectangle of component elements and pointer coordinates.
 * - `region-direct`: Like `direct` and adds the bounding rectangle of component elements and pointer coordinates.
 * - `all`: The most elaborate option. Currently the same as `coords,context`, yet may be extended in the future if additional options are added.
 */
export type ActivationTracking =
  | "none"
  | "auto"
  | "context"
  | "region-context"
  | "direct"
  | "region-direct"
  | "all";
