import { UserRoleEnum } from '../constants/enum';

/** What JwtStrategy.validate() puts on request.user. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRoleEnum;
}

/** Claims added by jsonwebtoken from the sign options. */
export interface JwtRegisteredClaims {
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export interface JwtAccessPayload extends JwtRegisteredClaims {
  /** user id */
  sub: string;
  email: string;
  role: UserRoleEnum;
  type: 'access';
}

export interface JwtRefreshPayload extends JwtRegisteredClaims {
  /** user id */
  sub: string;
  type: 'refresh';
}
