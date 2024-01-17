export interface Cookie {
  maxAge?: number;

  /** @default  false */
  httpOnly?: boolean;

  /** @default "Lax" */
  sameSitePolicy?: "Strict" | "Lax" | "None";

  essential?: boolean;

  value: string | null | undefined;

  /** @default false */
  fromRequest?: boolean;

  /** @internal */
  _originalValue?: string | null | undefined;
}

export interface ClientResponseCookie extends Cookie {
  essential: boolean;
  headerString: string;
  httpOnly: boolean;
  name: string;
  sameSitePolicy: Required<Cookie["sameSitePolicy"]>;
  secure: boolean;
}
