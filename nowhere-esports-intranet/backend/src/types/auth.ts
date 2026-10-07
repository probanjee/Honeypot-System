import { UserRole } from '../constants/roles';

// ---------------------------------------------------------------------------
// AuthUser — the typed representation of a verified Supabase user attached
// to req.user after JWT verification.
// ---------------------------------------------------------------------------

export interface AuthUser {
  /** Supabase user UUID */
  id: string;
  /** User's email address */
  email: string;
  /** Application role derived from app_metadata.role */
  role: UserRole;
  /** Whether the user's email has been verified */
  email_verified: boolean;
  /** Raw Supabase app_metadata */
  app_metadata: Record<string, unknown>;
  /** Raw Supabase user_metadata */
  user_metadata: Record<string, unknown>;
  /** ISO timestamp of last sign-in */
  last_sign_in_at?: string;
}
