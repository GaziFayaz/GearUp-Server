import { z } from "zod";

export const createPaymentSchema = z.object({
  rentalId: z.string().uuid("Invalid rental ID"),
  method: z.enum(["STRIPE", "SSLCOMMERZ"]),
});

export const confirmPaymentSchema = z.object({
  paymentId: z.string().uuid("Invalid payment ID"),
});
