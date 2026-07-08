import type { Request, Response } from "express";
import { rentalService } from "./rental.service";
import { sendResponse } from "../../utils/sendResponse";

const create = async (req: Request, res: Response) => {
  const result = await rentalService.createRental(req.user!.id, req.body);

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Rental order created successfully",
    data: result,
  });
};

const getUserRentals = async (req: Request, res: Response) => {
  const { status, page, limit } = req.query as Record<
    string,
    string | undefined
  >;

  const result = await rentalService.getUserRentals(req.user!.id, {
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

const getById = async (req: Request, res: Response) => {
  const result = await rentalService.getRentalById(
    req.params.id as string,
    req.user!.id,
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Rental order details retrieved successfully",
    data: result,
  });
};

const getProviderOrders = async (req: Request, res: Response) => {
  const { status, page, limit } = req.query as Record<
    string,
    string | undefined
  >;

  const result = await rentalService.getProviderOrders(req.user!.id, {
    status,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  });

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Incoming orders retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
};

const updateStatus = async (req: Request, res: Response) => {
  const result = await rentalService.updateOrderStatus(
    req.params.id as string,
    req.user!.id,
    req.body.status,
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: `Order status updated to ${req.body.status}`,
    data: result,
  });
};

export const rentalController = {
  create,
  getUserRentals,
  getById,
  getProviderOrders,
  updateStatus,
};
