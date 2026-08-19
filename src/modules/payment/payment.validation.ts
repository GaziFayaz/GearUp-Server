import { z } from "zod";

export const createPaymentSchema = z.object({
  rentalId: z.string().uuid("Invalid rental ID"),
  method: z.enum(["STRIPE", "SSLCOMMERZ"]),
});

export const createCheckoutSessionSchema = z.object({
  rentalId: z.string().uuid("Invalid rental ID"),
});

export const confirmPaymentSchema = z.object({
  paymentId: z.string().uuid("Invalid payment ID"),
});

export const verifySessionSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
});



