import { Router } from "express";
import { gearController } from "./gear.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { createGearSchema, updateGearSchema } from "./gear.validation";
import { authenticate, authorize } from "../../middleware/auth";
import catchAsync from "../../utils/catchAsync";

const router = Router();

// Public routes
router.get("/", catchAsync(gearController.getAll));
router.get("/:id", catchAsync(gearController.getById));

// Provider routes
const providerRouter = Router();
providerRouter.use(authenticate, authorize("PROVIDER"));

providerRouter.post("/", validateRequest(createGearSchema), catchAsync(gearController.create));
providerRouter.put("/:id", validateRequest(updateGearSchema), catchAsync(gearController.update));
providerRouter.delete("/:id", catchAsync(gearController.remove));
providerRouter.get("/", catchAsync(gearController.getMyGear));

export default router;
export { providerRouter };
