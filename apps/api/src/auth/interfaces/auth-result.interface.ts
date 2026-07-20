export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: string;
}

export interface AuthUserSummary {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  isGuest: boolean;
}

export interface AuthResult extends AuthTokens {
  user: AuthUserSummary;
}
