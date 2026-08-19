import { Router } from "express";
import { paymentController } from "./payment.controller.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import {
  createPaymentSchema,
  confirmPaymentSchema,
  createCheckoutSessionSchema,
  verifySessionSchema,
} from "./payment.validation.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import catchAsync from "../../utils/catchAsync.js";

const router = Router();

// Unauthenticated Webhook endpoint (Stripe server-to-server)
router.post("/webhook", catchAsync(paymentController.handleWebhook));

// Authenticated routes
router.use(authenticate);

router.post(
  "/create-checkout-session",
  authorize("CUSTOMER"),
  validateRequest(createCheckoutSessionSchema),
  catchAsync(paymentController.createCheckoutSession),
);

router.get(
  "/verify-session",
  authorize("CUSTOMER"),
  validateRequest(verifySessionSchema, "query"),
  catchAsync(paymentController.verifySession),
);

router.post(
  "/create",
  authorize("CUSTOMER"),
  validateRequest(createPaymentSchema),
  catchAsync(paymentController.create),
);

router.post(
  "/confirm",
  authorize("CUSTOMER"),
  validateRequest(confirmPaymentSchema),
  catchAsync(paymentController.confirm),
);

router.get("/", catchAsync(paymentController.getUserPayments));
router.get("/:id", catchAsync(paymentController.getById));

export default router;
