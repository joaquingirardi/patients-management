import { type AuthUser } from '@pm/contracts';

/** What the browser knows about the session. The token itself never reaches client JS. */
export interface Session {
  user: AuthUser;
  /** Epoch milliseconds (server clock). */
  expiresAt: number;
  /**
   * The server's clock when the session was read. Expiry is scheduled from the *difference*
   * (`expiresAt - serverNow`), so a client clock that is minutes or hours off cannot log the
   * user out on arrival or keep a dead session alive.
   */
  serverNow: number;
}
