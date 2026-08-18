import { prisma } from "../../lib/prisma.js";

const getAllCategories = async () => {
  return prisma.category.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { gearItems: true } },
    },
  });
};

export const categoryService = {
  getAllCategories,
};
