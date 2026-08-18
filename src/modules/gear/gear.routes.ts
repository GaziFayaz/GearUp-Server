import { Router } from "express";
import { gearController } from "./gear.controller.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { createGearSchema, updateGearSchema } from "./gear.validation.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import catchAsync from "../../utils/catchAsync.js";

const router = Router();

// Public routes
router.get("/", catchAsync(gearController.getAll));
router.get("/:id", catchAsync(gearController.getById));

// Provider routes
const providerRouter = Router();
providerRouter.use(authenticate, authorize("PROVIDER"));

providerRouter.post(
  "/",
  validateRequest(createGearSchema),
  catchAsync(gearController.create),
);
providerRouter.put(
  "/:id",
  validateRequest(updateGearSchema),
  catchAsync(gearController.update),
);
providerRouter.delete("/:id", catchAsync(gearController.remove));
providerRouter.get("/", catchAsync(gearController.getMyGear));

export default router;
export { providerRouter };
