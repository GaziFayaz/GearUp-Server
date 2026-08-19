import type { Request, Response } from "express";
import { paymentService } from "./payment.service.js";
import { sendResponse } from "../../utils/sendResponse.js";

const createCheckoutSession = async (req: Request, res: Response) => {
  const result = await paymentService.createCheckoutSession(
    req.user!.id,
    req.body.rentalId,
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Stripe checkout session created successfully",
    data: result,
  });
};

const verifySession = async (req: Request, res: Response) => {
  const sessionId = (req.query.sessionId || req.body?.sessionId) as string;

  const result = await paymentService.verifySession(
    sessionId,
    req.user!.id,
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Payment session verified successfully",
    data: result,
  });
};

const handleWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  const rawBody = (req as any).rawBody || req.body;

  const result = await paymentService.handleWebhook(rawBody, sig);

  res.status(200).json(result);
};

const create = async (req: Request, res: Response) => {
  const result = await paymentService.createPayment(
    req.user!.id,
    req.body.rentalId,
    req.body.method,
  );

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Payment created successfully",
    data: result,
  });
};

const confirm = async (req: Request, res: Response) => {
  const result = await paymentService.confirmPayment(
    req.body.paymentId,
    req.user!.id,
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Payment confirmed successfully",
    data: result,
  });
};

const getUserPayments = async (req: Request, res: Response) => {
  const { page, limit } = req.query as Record<string, string | undefined>;

  const result = await paymentService.getUserPayments(req.user!.id, {
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  });

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Payment history retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
};

const getById = async (req: Request, res: Response) => {
  const result = await paymentService.getPaymentById(
    req.params.id as string,
    req.user!.id,
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Payment details retrieved successfully",
    data: result,
  });
};

export const paymentController = {
  createCheckoutSession,
  verifySession,
  handleWebhook,
  create,
  confirm,
  getUserPayments,
  getById,
};
