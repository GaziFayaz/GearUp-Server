import { prisma } from "../../lib/prisma";

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
