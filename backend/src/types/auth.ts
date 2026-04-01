import type { UserRole } from "@prisma/client";

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  sessionVersion: number;
  tokenType: "access" | "refresh";
}

export interface AuthenticatedRequestUser {
  id: string;
  email: string;
  role: UserRole;
  sessionVersion: number;
}
