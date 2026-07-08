import type { Request, Response } from "express";
import { authService } from "./auth.service";
import { sendResponse } from "../../utils/sendResponse";

const register = async (req: Request, res: Response) => {
  const result = await authService.registerUser(req.body);

  res.cookie("refreshToken", result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "User registered successfully",
    data: {
      user: result.user,
      accessToken: result.accessToken,
    },
  });
};

const login = async (req: Request, res: Response) => {
  const result = await authService.loginUser(req.body.email, req.body.password);

  res.cookie("refreshToken", result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Login successful",
    data: {
      user: result.user,
      accessToken: result.accessToken,
    },
  });
};

const getMe = async (req: Request, res: Response) => {
  const result = await authService.getMe(req.user!.id);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "User fetched successfully",
    data: result,
  });
};

export const authController = {
  register,
  login,
  getMe,
};
