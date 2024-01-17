import { TrackedEvent } from "..";

/**
 * Events implementing this interface are supporting the infrastructure and should not appear in BI/analytics.
 */
export interface SystemEvent extends TrackedEvent {}
