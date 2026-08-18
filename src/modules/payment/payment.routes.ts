import { Router } from "express";
import { paymentController } from "./payment.controller.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import {
  createPaymentSchema,
  confirmPaymentSchema,
} from "./payment.validation.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import catchAsync from "../../utils/catchAsync.js";

const router = Router();

router.use(authenticate);

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
