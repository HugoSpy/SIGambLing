import type { AuthenticatedRequestUser } from "./auth";

declare global {
  namespace Express {
    interface User extends AuthenticatedRequestUser {}

    interface Request {
      auth?: AuthenticatedRequestUser;
    }
  }
}

export {};
