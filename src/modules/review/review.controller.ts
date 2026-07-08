import type { Request, Response } from "express";
import { reviewService } from "./review.service";
import { sendResponse } from "../../utils/sendResponse";

const create = async (req: Request, res: Response) => {
  const result = await reviewService.createReview(req.user!.id, req.body);

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Review created successfully",
    data: result,
  });
};

const getByGear = async (req: Request, res: Response) => {
  const result = await reviewService.getGearReviews(req.params.gearId as string);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Reviews retrieved successfully",
    data: result,
  });
};

export const reviewController = {
  create,
  getByGear,
};
