import { Router } from "express";
import { categoryController } from "./category.controller";
import catchAsync from "../../utils/catchAsync";

const router = Router();

router.get("/", catchAsync(categoryController.getAll));

export default router;
