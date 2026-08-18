import type { Request, Response } from "express";
import { adminService } from "./admin.service.js";
import { sendResponse } from "../../utils/sendResponse.js";

const getAllUsers = async (req: Request, res: Response) => {
  const { role, status, search, page, limit } = req.query as Record<
    string,
    string | undefined
  >;

  const result = await adminService.getAllUsers({
    role,
    status,
    search,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  });

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Users retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
};

const updateUserStatus = async (req: Request, res: Response) => {
  const result = await adminService.updateUserStatus(
    req.params.id as string,
    req.body.status,
    req.user!.id,
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: `User status updated to ${req.body.status}`,
    data: result,
  });
};

const getAllGear = async (req: Request, res: Response) => {
  const { providerId, category, page, limit } = req.query as Record<
    string,
    string | undefined
  >;

  const result = await adminService.getAllGear({
    providerId,
    category,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  });

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Gear listings retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
};

const toggleGearAvailability = async (req: Request, res: Response) => {
  const result = await adminService.toggleGearAvailability(
    req.params.id as string,
    req.body.isAvailable,
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: `Gear availability updated`,
    data: result,
  });
};

const getAllRentals = async (req: Request, res: Response) => {
  const { status, page, limit } = req.query as Record<
    string,
    string | undefined
  >;

  const result = await adminService.getAllRentals({
    status,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  });

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Rental orders retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
};

const getStats = async (_req: Request, res: Response) => {
  const result = await adminService.getPlatformStats();

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Platform statistics retrieved successfully",
    data: result,
  });
};

const createCategory = async (req: Request, res: Response) => {
  const result = await adminService.createCategory(req.body);

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Category created successfully",
    data: result,
  });
};

const updateCategory = async (req: Request, res: Response) => {
  const result = await adminService.updateCategory(
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Category updated successfully",
    data: result,
  });
};

const deleteCategory = async (req: Request, res: Response) => {
  const result = await adminService.deleteCategory(req.params.id as string);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: result.message,
  });
};

export const adminController = {
  getAllUsers,
  updateUserStatus,
  getAllGear,
  toggleGearAvailability,
  getAllRentals,
  getStats,
  createCategory,
  updateCategory,
  deleteCategory,
};
