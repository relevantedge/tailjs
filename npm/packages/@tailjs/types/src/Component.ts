import type { ExternalReference, Integer, Personalizable, Tagged } from ".";

export interface Component extends ExternalReference, Personalizable, Tagged {
  /**
   * An additional type name that defines the component as represented in code. For example, the name of a (p)react component or ASP.NET partial.
   */
  typeName?: string;

  /**
   * Optional references to the content that was used to render the component.
   */
  dataSource?: ExternalReference;

  /**
   * An optional, unique identifier for the specific instance of the component with its parameters and current position in the rendered element tree.
   */
  instanceId?: string;

  /**
   * If the same component type is used multiple times on the same page this number indicates which one it is. (As defined in the page's markup, typically this amounts to left-to-right/top-to-bottom).
   */
  instanceNumber?: Integer;

  /**
   * A flag indicating whether the component was automatically inferred from context (e.g. by traversing the tree of React components).
   *
   * @default false
   */
  inferred?: boolean;
}
