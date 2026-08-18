import { Router } from "express";
import { reviewController } from "./review.controller.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { createReviewSchema } from "./review.validation.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import catchAsync from "../../utils/catchAsync.js";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize("CUSTOMER"),
  validateRequest(createReviewSchema),
  catchAsync(reviewController.create),
);

router.get("/gear/:gearId", catchAsync(reviewController.getByGear));

export default router;
