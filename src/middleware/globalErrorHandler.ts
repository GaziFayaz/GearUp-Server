import type { Request, Response, NextFunction } from "express";
import config from "../config/index.js";
import { sendResponse } from "../utils/sendResponse.js";
import AppError from "../utils/AppError.js";
import type { ZodError } from "zod";

export const globalErrorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  let statusCode = 500;
  let message = "Something went wrong!";

  if (err instanceof AppError) {
    const appErr = err as AppError;
    statusCode = appErr.statusCode;
    message = appErr.message;
  } else if (err.name === "ZodError") {
    statusCode = 400;
    const zodErr = err as unknown as ZodError;
    message = zodErr.issues.map((i) => i.message).join(", ");
  } else if (
    err.name === "JsonWebTokenError" ||
    err.name === "TokenExpiredError"
  ) {
    statusCode = 401;
    message = err.message;
  }

  sendResponse(res, {
    success: false,
    statusCode,
    message,
    data: config.node_env === "development" ? err.stack : undefined,
  });
};
