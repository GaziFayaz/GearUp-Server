import type { Request, Response } from "express";
import { categoryService } from "./category.service.js";
import { sendResponse } from "../../utils/sendResponse.js";

const getAll = async (_req: Request, res: Response) => {
  const result = await categoryService.getAllCategories();

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Categories retrieved successfully",
    data: result,
  });
};

export const categoryController = {
  getAll,
};
