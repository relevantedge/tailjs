// TODO: Implement this abstraction to abstract away Next 15 RSC parent components view `_owner`,
// and, generally, support representing component trees generically for CMS mappers (that could then also work with Vue etc.)
export interface ComponentInfo {
  name: string;
  displayName?: string;
  type?: any;
  properties: Record<string, any>;

  state?: Record<string, any>;
}

export class ComponentTree {}
