import { z } from "zod";

export const createReviewSchema = z.object({
  gearItemId: z.string().uuid("Invalid gear item ID"),
  rentalId: z.string().uuid("Invalid rental ID"),
  rating: z
    .number()
    .int()
    .min(1, "Rating must be at least 1")
    .max(5, "Rating must be at most 5"),
  comment: z
    .string()
    .max(500, "Comment must be 500 characters or less")
    .optional(),
});
