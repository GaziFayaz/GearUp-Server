import { Router } from "express";
import { adminController } from "./admin.controller.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import {
  updateUserStatusSchema,
  updateGearSchema,
  createCategorySchema,
  updateCategorySchema,
} from "./admin.validation.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import catchAsync from "../../utils/catchAsync.js";

const router = Router();

router.use(authenticate, authorize("ADMIN"));

router.get("/users", catchAsync(adminController.getAllUsers));
router.patch(
  "/users/:id",
  validateRequest(updateUserStatusSchema),
  catchAsync(adminController.updateUserStatus),
);
router.get("/gear", catchAsync(adminController.getAllGear));
router.patch(
  "/gear/:id",
  validateRequest(updateGearSchema),
  catchAsync(adminController.toggleGearAvailability),
);
router.get("/rentals", catchAsync(adminController.getAllRentals));
router.get("/stats", catchAsync(adminController.getStats));
router.post(
  "/categories",
  validateRequest(createCategorySchema),
  catchAsync(adminController.createCategory),
);
router.patch(
  "/categories/:id",
  validateRequest(updateCategorySchema),
  catchAsync(adminController.updateCategory),
);
router.delete("/categories/:id", catchAsync(adminController.deleteCategory));

export default router;
