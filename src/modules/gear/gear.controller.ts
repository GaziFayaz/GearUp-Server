import type { Request, Response } from "express";
import { gearService } from "./gear.service";
import { sendResponse } from "../../utils/sendResponse";

const getAll = async (req: Request, res: Response) => {
  const { categoryId, brand, minPrice, maxPrice, search, page, limit } =
    req.query as Record<string, string | undefined>;

  const result = await gearService.getAllGear({
    categoryId,
    brand,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    search,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  });

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Gear retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
};

const getById = async (req: Request, res: Response) => {
  const result = await gearService.getGearById(req.params.id as string);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Gear details retrieved successfully",
    data: result,
  });
};

const create = async (req: Request, res: Response) => {
  const result = await gearService.createGear(req.user!.id, req.body);

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Gear created successfully",
    data: result,
  });
};

const update = async (req: Request, res: Response) => {
  const result = await gearService.updateGear(
    req.params.id as string,
    req.user!.id,
    req.body,
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Gear updated successfully",
    data: result,
  });
};

const remove = async (req: Request, res: Response) => {
  const result = await gearService.deleteGear(
    req.params.id as string,
    req.user!.id,
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: result.message,
  });
};

const getMyGear = async (req: Request, res: Response) => {
  const result = await gearService.getMyGear(req.user!.id);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Your gear retrieved successfully",
    data: result,
  });
};

export const gearController = {
  getAll,
  getById,
  create,
  update,
  remove,
  getMyGear,
};
