import { z } from "zod";

const rentalItemSchema = z.object({
  gearItemId: z.string().uuid("Invalid gear item ID"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
});

export const createRentalSchema = z
  .object({
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    items: z.array(rentalItemSchema).min(1, "At least one item is required"),
  })
  .refine(
    (data) => {
      return new Date(data.endDate) > new Date(data.startDate);
    },
    { message: "End date must be after start date", path: ["endDate"] },
  );

export const updateStatusSchema = z.object({
  status: z.enum(["CONFIRMED", "PICKED_UP", "RETURNED"]),
});
