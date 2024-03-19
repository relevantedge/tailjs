import { typeTest } from "../util/type-test";
import { TrackedEvent } from "./TrackedEvent";

/**
 * Events related to users signing in, out etc..
 */
export interface AuthenticationEvent extends TrackedEvent {}

/**
 * A user signed in.
 */
export interface SignInEvent extends AuthenticationEvent {
  type: "SIGN_IN";
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
  type: "SIGN_OUT";
  /**
   * The user that signed out.
   */
  userId?: string;
}

export const isSignOutEvent = typeTest<SignOutEvent>("SIGN_OUT");

export const isSignInEvent = typeTest<SignInEvent>("SIGN_IN");
