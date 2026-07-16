export type TokenType = 'access' | 'refresh';

export interface TokenPayload {
  sub: string;
  email: string;
  permissions: number[];
  type: TokenType;
}