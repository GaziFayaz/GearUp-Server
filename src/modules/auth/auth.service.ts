import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";
import { jwtUtils } from "../../utils/jwt";
import config from "../../config";
import AppError from "../../utils/AppError";

const generateTokens = (payload: {
  id: string;
  email: string;
  role: string;
}) => {
  const accessToken = jwtUtils.createToken(payload, config.jwt_access_secret, {
    expiresIn: config.jwt_access_expires_in,
  } as any);

  const refreshToken = jwtUtils.createToken(
    { id: payload.id },
    config.jwt_refresh_secret,
    { expiresIn: config.jwt_refresh_expires_in } as any,
  );

  return { accessToken, refreshToken };
};

const sanitizeUser = (user: any) => {
  const { password, ...sanitized } = user;
  return sanitized;
};

const registerUser = async (data: {
  name: string;
  email: string;
  password: string;
  role?: string;
}) => {
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new AppError(409, "A user with this email already exists.");
  }

  const hashedPassword = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: (data.role as any) || "CUSTOMER",
    },
  });

  const tokens = generateTokens({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    user: sanitizeUser(user),
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
};

const loginUser = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AppError(401, "Invalid email or password.");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AppError(401, "Invalid email or password.");
  }

  if (user.status === "SUSPENDED") {
    throw new AppError(
      403,
      "Your account has been suspended. Contact support.",
    );
  }

  const tokens = generateTokens({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    user: sanitizeUser(user),
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
};

const getMe = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError(404, "User not found.");
  }

  return sanitizeUser(user);
};

export const authService = {
  registerUser,
  loginUser,
  getMe,
};
