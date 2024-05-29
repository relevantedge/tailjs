import { TrackedEvent } from ".";
import { typeTest } from "../util/type-test";

/**
 * Events related to users signing in, out etc..
 */
export interface AuthenticationEvent extends TrackedEvent {}

/**
 * A user signed in.
 */
export interface SignInEvent extends AuthenticationEvent {
  type: "sign_in";
  /**
   * The user that signed in.
   */
  userId: string;

  /**
   * Custom data that can be used to validate the login server-side to make sure that userdata cannot get hijacked
   * by abusing the API.
   */
  evidence: string;
}

/**
 * A user actively signed out. (Session expiry doesn't count).
 */
export interface SignOutEvent extends AuthenticationEvent {
  type: "sign_out";
  /**
   * The user that signed out.
   */
  userId?: string;
}

export const isSignOutEvent = typeTest<SignOutEvent>("sign_out");

export const isSignInEvent = typeTest<SignInEvent>("sign_in");
