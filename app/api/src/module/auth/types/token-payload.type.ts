export type TokenType = 'access' | 'refresh';

export interface TokenPayload {
  sub: string;
  email: string;
  permissions: number[];
  type: TokenType;
  jti: string;
}

/** jwt เติม iat/exp ให้ตอน sign เราจึงได้ครบเฉพาะตอน verify */
export type VerifiedTokenPayload = TokenPayload & {
  iat: number;
  exp: number;
};
