import { z } from "zod";

export const updateUserStatusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED"]),
});

export const updateGearSchema = z.object({
  isAvailable: z.boolean(),
});

export const createCategorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50),
  description: z.string().optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(2).max(50).optional(),
  description: z.string().optional(),
});
