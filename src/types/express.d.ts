import type { User } from "../../generated/prisma/client.js";

declare global {
  namespace Express {
    interface Request {
      user?: Pick<User, "id" | "email" | "role" | "status">;
    }
  }
}
