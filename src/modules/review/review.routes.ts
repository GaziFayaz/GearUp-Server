import { Router } from "express";
import { reviewController } from "./review.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { createReviewSchema } from "./review.validation";
import { authenticate, authorize } from "../../middleware/auth";
import catchAsync from "../../utils/catchAsync";

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
