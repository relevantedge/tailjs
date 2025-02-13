/**
 * Uniquely addresses a variable by scope, target and key name.
 */

export interface VariableKey {
  /**
   * An optional identifier of a specific variable storage such as "crm" or "personalization"
   * if not addressing tail.js's own storage.
   */
  source?: string | null;

  /** The scope the variable belongs to. */
  scope: string;

  /**
   * The name of the variable.
   *
   * A key may have a prefix that decides which variable storage it is routed to such as `crm:` or `personalization:`.
   * The prefix and the key are separated by a colon (`prefix:key`), and the key may not contain a colon itself.
   */
  key: string;

  /**
   * The ID of the entity in the scope the variable belongs to.
   *
   * In the global scope, variables augmenting external entities the IDs should be prefixed with the entity type such as `page:xxxx`
   * if they are not unique identifiers to avoid clashes.
   */
  entityId: string;
}
