import { Router } from "express";
import { rentalController } from "./rental.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { createRentalSchema, updateStatusSchema } from "./rental.validation";
import { authenticate, authorize } from "../../middleware/auth";
import catchAsync from "../../utils/catchAsync";

// Customer routes
const customerRouter = Router();
customerRouter.use(authenticate, authorize("CUSTOMER"));

customerRouter.post(
  "/",
  validateRequest(createRentalSchema),
  catchAsync(rentalController.create),
);
customerRouter.get("/", catchAsync(rentalController.getUserRentals));
customerRouter.get("/:id", catchAsync(rentalController.getById));

// Provider routes
const providerRouter = Router();
providerRouter.use(authenticate, authorize("PROVIDER"));

providerRouter.get("/", catchAsync(rentalController.getProviderOrders));
providerRouter.patch(
  "/:id",
  validateRequest(updateStatusSchema),
  catchAsync(rentalController.updateStatus),
);

export default customerRouter;
export { providerRouter };
