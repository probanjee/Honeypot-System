import { UserRole } from '../constants/roles';


// ---------------------------------------------------------------------------
// Authentication DTOs — shape of data returned in API responses.
// These never expose JWTs, service keys, or internal IDs.
// ---------------------------------------------------------------------------

/** Token pair returned in auth responses */
export interface TokenDto {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: 'bearer';
}

/** Minimal user object included in auth responses */
export interface AuthUserDto {
  id: string;
  email: string;
  role: UserRole;
  email_verified: boolean;
  first_name: string;
  last_name: string;
}

/** Full auth response returned on register/login */
export interface AuthResponseDto {
  user: AuthUserDto;
  session: TokenDto;
}

/** Response for operations that only return a message */
export interface MessageResponseDto {
  message: string;
}
