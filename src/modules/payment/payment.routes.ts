import { Router } from "express";
import { paymentController } from "./payment.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { createPaymentSchema, confirmPaymentSchema } from "./payment.validation";
import { authenticate, authorize } from "../../middleware/auth";
import catchAsync from "../../utils/catchAsync";

const router = Router();

router.use(authenticate);

router.post("/create", authorize("CUSTOMER"), validateRequest(createPaymentSchema), catchAsync(paymentController.create));
router.post("/confirm", authorize("CUSTOMER"), validateRequest(confirmPaymentSchema), catchAsync(paymentController.confirm));
router.get("/", catchAsync(paymentController.getUserPayments));
router.get("/:id", catchAsync(paymentController.getById));

export default router;
