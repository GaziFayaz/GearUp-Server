import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/AppError.js";

const createReview = async (
  customerId: string,
  data: {
    gearItemId: string;
    rentalId: string;
    rating: number;
    comment?: string;
  },
) => {
  // Verify rental belongs to customer and includes the gear item
  const rental = await prisma.rentalOrder.findUnique({
    where: { id: data.rentalId },
    include: { rentalItems: true },
  });

  if (!rental) {
    throw new AppError(404, "Rental order not found.");
  }

  if (rental.customerId !== customerId) {
    throw new AppError(403, "You can only review gear from your own rentals.");
  }

  const rentalIncludesGear = rental.rentalItems.some(
    (item) => item.gearItemId === data.gearItemId,
  );
  if (!rentalIncludesGear) {
    throw new AppError(
      400,
      "This rental does not include the specified gear item.",
    );
  }

  // Check for existing review (unique constraint on customerId + gearItemId)
  const existingReview = await prisma.review.findUnique({
    where: {
      customerId_gearItemId: {
        customerId,
        gearItemId: data.gearItemId,
      },
    },
  });

  if (existingReview) {
    throw new AppError(409, "You have already reviewed this gear item.");
  }

  const review = await prisma.review.create({
    data: {
      customerId,
      gearItemId: data.gearItemId,
      rentalId: data.rentalId,
      rating: data.rating,
      comment: data.comment,
    },
    include: {
      customer: { select: { id: true, name: true } },
    },
  });

  return review;
};

const getGearReviews = async (gearItemId: string) => {
  const reviews = await prisma.review.findMany({
    where: { gearItemId },
    include: {
      customer: { select: { id: true, name: true, profileImage: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  return {
    reviews,
    averageRating: Math.round(averageRating * 10) / 10,
    totalReviews: reviews.length,
  };
};

export const reviewService = {
  createReview,
  getGearReviews,
};
