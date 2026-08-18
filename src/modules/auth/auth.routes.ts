import { Router } from "express";
import { authController } from "./auth.controller.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { registerSchema, loginSchema } from "./auth.validation.js";
import { authenticate } from "../../middleware/auth.js";
import catchAsync from "../../utils/catchAsync.js";

const router = Router();

router.post(
  "/register",
  validateRequest(registerSchema),
  catchAsync(authController.register),
);

router.post(
  "/login",
  validateRequest(loginSchema),
  catchAsync(authController.login),
);

router.get("/me", authenticate, catchAsync(authController.getMe));

export default router;
