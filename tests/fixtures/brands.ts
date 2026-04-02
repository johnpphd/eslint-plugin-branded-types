// Simulates Zod branded types as used in real projects
type Brand<T, B extends string> = T & { __brand: B };

export type UserId = Brand<string, "UserId">;
export type SessionId = Brand<string, "SessionId">;
export type Email = Brand<string, "Email">;
export type PhoneNumber = Brand<string, "PhoneNumber">;
export type BrandedToken = Brand<string, "BrandedToken">;

// Plain types (no __brand) to verify false positives don't occur
export type UserName = string;
export type Config = { key: string; value: string };

// Simulates Zod schema objects
export declare const UserIdSchema: {
  parse(v: unknown): UserId;
  safeParse(v: unknown): { success: boolean; data: UserId };
};
export declare const EmailSchema: {
  parse(v: unknown): Email;
  safeParse(v: unknown): { success: boolean; data: Email };
};
