import type { Request, Response, NextFunction } from "express";
import config from "../config/index.js";
import { jwtUtils } from "../utils/jwt.js";
import { prisma } from "../lib/prisma.js";
import AppError from "../utils/AppError.js";

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError(401, "You are not authorized. No token provided.");
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    throw new AppError(401, "You are not authorized. No token provided.");
  }

  const decoded = jwtUtils.verifyToken(token, config.jwt_access_secret);
  if (!decoded.success || !decoded.payload) {
    throw new AppError(401, decoded.error || "Invalid token.");
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.payload.id },
    select: { id: true, email: true, role: true, status: true },
  });

  if (!user) {
    throw new AppError(401, "User not found.");
  }

  if (user.status === "SUSPENDED") {
    throw new AppError(403, "Your account has been suspended.");
  }

  req.user = user;
  next();
};

export const authorize = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError(
        403,
        "You do not have permission to perform this action.",
      );
    }
    next();
  };
};
