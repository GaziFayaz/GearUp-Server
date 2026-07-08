import type { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import AppError from "../../utils/AppError";

type CreateGearInput = {
  name: string;
  description?: string;
  brand?: string;
  pricePerDay: number;
  stockQuantity: number;
  categoryId: string;
  imageUrls?: string[];
  specifications?: Record<string, unknown>;
};

type GetAllFilters = {
  categoryId?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  page?: number;
  limit?: number;
  isAvailable?: boolean;
};

const gearSelect = {
  id: true,
  name: true,
  description: true,
  brand: true,
  pricePerDay: true,
  stockQuantity: true,
  isAvailable: true,
  imageUrls: true,
  specifications: true,
  categoryId: true,
  providerId: true,
  createdAt: true,
  updatedAt: true,
  provider: { select: { id: true, name: true, email: true } },
  category: { select: { id: true, name: true } },
};

const getAllGear = async (filters: GetAllFilters) => {
  const { categoryId, brand, minPrice, maxPrice, search, page = 1, limit = 10, isAvailable = true } = filters;

  const where: Prisma.GearItemWhereInput = { isAvailable };

  if (categoryId) {
    where.categoryId = categoryId;
  }
  if (brand) {
    where.brand = { contains: brand, mode: "insensitive" };
  }
  if (minPrice !== undefined || maxPrice !== undefined) {
    where.pricePerDay = {};
    if (minPrice !== undefined) where.pricePerDay.gte = minPrice;
    if (maxPrice !== undefined) where.pricePerDay.lte = maxPrice;
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.gearItem.findMany({
      where,
      select: gearSelect,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.gearItem.count({ where }),
  ]);

  return {
    data,
    meta: { page, limit, total },
  };
};

const getGearById = async (id: string) => {
  const gear = await prisma.gearItem.findUnique({
    where: { id },
    select: {
      ...gearSelect,
      reviews: {
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          customer: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!gear) {
    throw new AppError(404, "Gear item not found.");
  }

  return gear;
};

const createGear = async (providerId: string, data: CreateGearInput) => {
  const category = await prisma.category.findUnique({
    where: { id: data.categoryId },
  });

  if (!category) {
    throw new AppError(404, "Category not found.");
  }

  return prisma.gearItem.create({
    data: {
      name: data.name,
      description: data.description,
      brand: data.brand,
      pricePerDay: data.pricePerDay,
      stockQuantity: data.stockQuantity,
      categoryId: data.categoryId,
      providerId,
      imageUrls: data.imageUrls || [],
      specifications: data.specifications as any,
    },
    select: gearSelect,
  });
};

const updateGear = async (gearId: string, providerId: string, data: Partial<CreateGearInput & { isAvailable: boolean }>) => {
  const gear = await prisma.gearItem.findUnique({ where: { id: gearId } });

  if (!gear) {
    throw new AppError(404, "Gear item not found.");
  }

  if (gear.providerId !== providerId) {
    throw new AppError(403, "You can only update your own gear.");
  }

  if (data.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category) throw new AppError(404, "Category not found.");
  }

  return prisma.gearItem.update({
    where: { id: gearId },
    data: data as any,
    select: gearSelect,
  });
};

const deleteGear = async (gearId: string, providerId: string) => {
  const gear = await prisma.gearItem.findUnique({ where: { id: gearId } });

  if (!gear) {
    throw new AppError(404, "Gear item not found.");
  }

  if (gear.providerId !== providerId) {
    throw new AppError(403, "You can only delete your own gear.");
  }

  await prisma.gearItem.delete({ where: { id: gearId } });
  return { message: "Gear item deleted successfully." };
};

const getMyGear = async (providerId: string) => {
  return prisma.gearItem.findMany({
    where: { providerId },
    select: gearSelect,
    orderBy: { createdAt: "desc" },
  });
};

export const gearService = {
  getAllGear,
  getGearById,
  createGear,
  updateGear,
  deleteGear,
  getMyGear,
};
