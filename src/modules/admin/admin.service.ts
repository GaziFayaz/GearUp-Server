import { prisma } from "../../lib/prisma.js";
import AppError from "../../utils/AppError.js";

const getAllUsers = async (filters: {
  role?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const { role, status, search, page = 1, limit = 10 } = filters;

  const where: any = {};
  if (role) where.role = role;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where }),
  ]);

  return { data, meta: { page, limit, total } };
};

const updateUserStatus = async (
  userId: string,
  status: string,
  adminId: string,
) => {
  if (userId === adminId) {
    throw new AppError(400, "You cannot change your own status.");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(404, "User not found.");
  }

  return prisma.user.update({
    where: { id: userId },
    data: { status: status as any },
    select: { id: true, name: true, email: true, role: true, status: true },
  });
};

const getAllGear = async (filters: {
  providerId?: string;
  category?: string;
  page?: number;
  limit?: number;
}) => {
  const { providerId, category, page = 1, limit = 10 } = filters;

  const where: any = {};
  if (providerId) where.providerId = providerId;
  if (category) where.categoryId = category;

  const [data, total] = await Promise.all([
    prisma.gearItem.findMany({
      where,
      include: {
        provider: { select: { id: true, name: true, email: true } },
        category: { select: { id: true, name: true } },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.gearItem.count({ where }),
  ]);

  return { data, meta: { page, limit, total } };
};

const toggleGearAvailability = async (gearId: string, isAvailable: boolean) => {
  const gear = await prisma.gearItem.findUnique({ where: { id: gearId } });
  if (!gear) throw new AppError(404, "Gear item not found.");

  return prisma.gearItem.update({
    where: { id: gearId },
    data: { isAvailable },
  });
};

const getAllRentals = async (filters: {
  status?: string;
  page?: number;
  limit?: number;
}) => {
  const { status, page = 1, limit = 10 } = filters;
  const where: any = {};
  if (status) where.status = status;

  const [data, total] = await Promise.all([
    prisma.rentalOrder.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, email: true } },
        rentalItems: {
          include: { gearItem: { select: { id: true, name: true } } },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.rentalOrder.count({ where }),
  ]);

  return { data, meta: { page, limit, total } };
};

const getPlatformStats = async () => {
  const [
    totalUsers,
    usersByRole,
    totalGear,
    gearByCategory,
    totalRentals,
    rentalsByStatus,
    completedRevenue,
  ] = await Promise.allSettled([
    prisma.user.count(),
    prisma.user.groupBy({ by: ["role"], _count: true }),
    prisma.gearItem.count(),
    prisma.gearItem.groupBy({ by: ["categoryId"], _count: true }),
    prisma.rentalOrder.count(),
    prisma.rentalOrder.groupBy({ by: ["status"], _count: true }),
    prisma.payment.aggregate({
      where: { status: "COMPLETED" },
      _sum: { amount: true },
    }),
  ]);

  const getValue = <T>(result: PromiseSettledResult<T>, fallback: T): T => {
    return result.status === "fulfilled" ? result.value : fallback;
  };

  return {
    totalUsers: getValue(totalUsers, 0),
    usersByRole: getValue(usersByRole, []),
    totalGear: getValue(totalGear, 0),
    gearByCategory: getValue(gearByCategory, []),
    totalRentals: getValue(totalRentals, 0),
    rentalsByStatus: getValue(rentalsByStatus, []),
    completedRevenue: getValue(completedRevenue, {
      _sum: { amount: 0 },
    } as any),
  } as any;
};

const createCategory = async (data: { name: string; description?: string }) => {
  const existing = await prisma.category.findUnique({
    where: { name: data.name },
  });
  if (existing)
    throw new AppError(409, "A category with this name already exists.");

  return prisma.category.create({ data });
};

const updateCategory = async (
  id: string,
  data: { name?: string; description?: string },
) => {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw new AppError(404, "Category not found.");

  if (data.name) {
    const existing = await prisma.category.findUnique({
      where: { name: data.name },
    });
    if (existing && existing.id !== id) {
      throw new AppError(409, "A category with this name already exists.");
    }
  }

  return prisma.category.update({ where: { id }, data });
};

const deleteCategory = async (id: string) => {
  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { gearItems: true } } },
  });

  if (!category) throw new AppError(404, "Category not found.");
  if (category._count.gearItems > 0) {
    throw new AppError(400, "Cannot delete category with existing gear items.");
  }

  await prisma.category.delete({ where: { id } });
  return { message: "Category deleted successfully." };
};

export const adminService = {
  getAllUsers,
  updateUserStatus,
  getAllGear,
  toggleGearAvailability,
  getAllRentals,
  getPlatformStats,
  createCategory,
  updateCategory,
  deleteCategory,
};
