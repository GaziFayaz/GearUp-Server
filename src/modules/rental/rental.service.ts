import { prisma } from "../../lib/prisma";
import AppError from "../../utils/AppError";

type CreateRentalInput = {
  startDate: string;
  endDate: string;
  items: { gearItemId: string; quantity: number }[];
};

const rentalInclude = {
  rentalItems: {
    include: {
      gearItem: {
        select: { id: true, name: true, brand: true, pricePerDay: true },
      },
    },
  },
  customer: { select: { id: true, name: true, email: true } },
  payments: true,
};

const createRental = async (customerId: string, data: CreateRentalInput) => {
  const parsedStart = new Date(data.startDate);
  const parsedEnd = new Date(data.endDate);

  if (parsedEnd <= parsedStart) {
    throw new AppError(400, "End date must be after start date.");
  }

  const rentalDays = Math.ceil(
    (parsedEnd.getTime() - parsedStart.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Validate all gear items exist and have stock
  const gearIds = data.items.map((i) => i.gearItemId);
  const gearItems = await prisma.gearItem.findMany({
    where: { id: { in: gearIds } },
  });

  if (gearItems.length !== gearIds.length) {
    throw new AppError(400, "One or more gear items not found.");
  }

  for (const item of data.items) {
    const gear = gearItems.find((g) => g.id === item.gearItemId);
    if (!gear)
      throw new AppError(400, `Gear item ${item.gearItemId} not found.`);
    if (!gear.isAvailable)
      throw new AppError(400, `Gear "${gear.name}" is not available.`);
    if (gear.stockQuantity < item.quantity) {
      throw new AppError(
        400,
        `Insufficient stock for "${gear.name}". Available: ${gear.stockQuantity}, requested: ${item.quantity}`,
      );
    }
  }

  // Calculate total
  let totalAmount = 0;
  for (const item of data.items) {
    const gear = gearItems.find((g) => g.id === item.gearItemId)!;
    totalAmount += Number(gear.pricePerDay) * item.quantity * rentalDays;
  }

  // Transaction: create order, items, and decrease stock
  const rental = await prisma.$transaction(async (tx) => {
    const order = await tx.rentalOrder.create({
      data: {
        customerId,
        startDate: parsedStart,
        endDate: parsedEnd,
        totalAmount,
        status: "PENDING",
        rentalItems: {
          create: data.items.map((item) => {
            const gear = gearItems.find((g) => g.id === item.gearItemId)!;
            return {
              gearItemId: item.gearItemId,
              quantity: item.quantity,
              pricePerDay: gear.pricePerDay,
            };
          }),
        },
      },
      include: rentalInclude,
    });

    // Decrease stock
    for (const item of data.items) {
      await tx.gearItem.update({
        where: { id: item.gearItemId },
        data: { stockQuantity: { decrement: item.quantity } },
      });
    }

    return order;
  });

  return rental;
};

const getUserRentals = async (
  customerId: string,
  filters: { status?: string; page?: number; limit?: number },
) => {
  const { status, page = 1, limit = 10 } = filters;
  const where: any = { customerId };
  if (status) where.status = status;

  const [data, total] = await Promise.all([
    prisma.rentalOrder.findMany({
      where,
      include: rentalInclude,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.rentalOrder.count({ where }),
  ]);

  return { data, meta: { page, limit, total } };
};

const getRentalById = async (rentalId: string, userId: string) => {
  const rental = await prisma.rentalOrder.findUnique({
    where: { id: rentalId },
    include: rentalInclude,
  });

  if (!rental) {
    throw new AppError(404, "Rental order not found.");
  }

  const isOwner = rental.customerId === userId;
  const isProvider = rental.rentalItems.some(
    (item: any) => item.gearItem.providerId === userId,
  );

  if (!isOwner && !isProvider) {
    throw new AppError(403, "You do not have permission to view this order.");
  }

  return rental;
};

const getProviderOrders = async (
  providerId: string,
  filters: { status?: string; page?: number; limit?: number },
) => {
  const { status, page = 1, limit = 10 } = filters;

  const where: any = {
    rentalItems: {
      some: {
        gearItem: { providerId },
      },
    },
  };
  if (status) where.status = status;

  const [data, total] = await Promise.all([
    prisma.rentalOrder.findMany({
      where,
      include: rentalInclude,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.rentalOrder.count({ where }),
  ]);

  return { data, meta: { page, limit, total } };
};

const validTransitions: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PICKED_UP"],
  PICKED_UP: ["RETURNED"],
};

const updateOrderStatus = async (
  rentalId: string,
  providerId: string,
  newStatus: string,
) => {
  const rental = await prisma.rentalOrder.findUnique({
    where: { id: rentalId },
    include: {
      rentalItems: { include: { gearItem: true } },
    },
  });

  if (!rental) {
    throw new AppError(404, "Rental order not found.");
  }

  // Verify provider owns at least one item
  const ownsItem = rental.rentalItems.some(
    (item: any) => item.gearItem.providerId === providerId,
  );
  if (!ownsItem) {
    throw new AppError(403, "You can only update orders containing your gear.");
  }

  const allowedTransitions = validTransitions[rental.status] || [];
  if (!allowedTransitions.includes(newStatus)) {
    throw new AppError(
      400,
      `Cannot transition from ${rental.status} to ${newStatus}.`,
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const order = await tx.rentalOrder.update({
      where: { id: rentalId },
      data: { status: newStatus as any },
      include: rentalInclude,
    });

    // On return, restore stock
    if (newStatus === "RETURNED") {
      for (const item of rental.rentalItems as any[]) {
        await tx.gearItem.update({
          where: { id: item.gearItemId },
          data: { stockQuantity: { increment: item.quantity } },
        });
      }
    }

    return order;
  });

  return updated;
};

export const rentalService = {
  createRental,
  getUserRentals,
  getRentalById,
  getProviderOrders,
  updateOrderStatus,
};
