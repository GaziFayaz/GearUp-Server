import { Router } from "express";
import { authController } from "./auth.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { registerSchema, loginSchema } from "./auth.validation";
import { authenticate } from "../../middleware/auth";
import catchAsync from "../../utils/catchAsync";

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
