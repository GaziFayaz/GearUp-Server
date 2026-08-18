import { Router } from "express";
import { categoryController } from "./category.controller.js";
import catchAsync from "../../utils/catchAsync.js";

const router = Router();

router.get("/", catchAsync(categoryController.getAll));

export default router;
