import { Scoped } from ".";

/**
 * Events implementing this interface indicate that they contain information that applies to the user across all session (e.g. a user profile settings).
 */
export interface UserScoped extends Scoped {}
