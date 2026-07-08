import { z } from "zod";

export const createGearSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  description: z.string().max(1000).optional(),
  brand: z.string().max(100).optional(),
  pricePerDay: z.number().positive("Price must be positive"),
  stockQuantity: z.number().int().min(1, "Stock must be at least 1"),
  categoryId: z.string().uuid("Invalid category ID"),
  imageUrls: z.array(z.string()).optional(),
  specifications: z.record(z.string(), z.unknown()).optional(),
});

export const updateGearSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(1000).optional(),
  brand: z.string().max(100).optional(),
  pricePerDay: z.number().positive().optional(),
  stockQuantity: z.number().int().min(1).optional(),
  categoryId: z.string().uuid().optional(),
  imageUrls: z.array(z.string()).optional(),
  specifications: z.record(z.string(), z.unknown()).optional(),
  isAvailable: z.boolean().optional(),
});
