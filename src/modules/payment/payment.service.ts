import { prisma } from "../../lib/prisma";
import AppError from "../../utils/AppError";

const createPayment = async (
  customerId: string,
  rentalId: string,
  method: string,
) => {
  const rental = await prisma.rentalOrder.findUnique({
    where: { id: rentalId },
    include: { payments: true },
  });

  if (!rental) {
    throw new AppError(404, "Rental order not found.");
  }

  if (rental.customerId !== customerId) {
    throw new AppError(403, "You can only pay for your own rentals.");
  }

  const existingCompleted = rental.payments.find(
    (p) => p.status === "COMPLETED",
  );
  if (existingCompleted) {
    throw new AppError(400, "This rental has already been paid.");
  }

  const existingPending = rental.payments.find((p) => p.status === "PENDING");
  if (existingPending) {
    throw new AppError(
      400,
      "A pending payment already exists for this rental.",
    );
  }

  const payment = await prisma.payment.create({
    data: {
      rentalId,
      amount: rental.totalAmount,
      method: method as any,
      status: "PENDING",
      transactionId: `txn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    },
  });

  return payment;
};

const confirmPayment = async (paymentId: string, userId: string) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { rental: true },
  });

  if (!payment) {
    throw new AppError(404, "Payment not found.");
  }

  if (payment.rental.customerId !== userId) {
    throw new AppError(403, "You can only confirm your own payments.");
  }

  if (payment.status === "COMPLETED") {
    throw new AppError(400, "This payment has already been completed.");
  }

  if (payment.status === "FAILED") {
    throw new AppError(400, "Cannot confirm a failed payment.");
  }

  const updated = await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: "COMPLETED",
      paidAt: new Date(),
    },
  });

  return updated;
};

const getUserPayments = async (
  customerId: string,
  filters: { page?: number; limit?: number },
) => {
  const { page = 1, limit = 10 } = filters;

  const where = { rental: { customerId } };

  const [data, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        rental: {
          select: { id: true, totalAmount: true, status: true },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.payment.count({ where }),
  ]);

  return { data, meta: { page, limit, total } };
};

const getPaymentById = async (paymentId: string, userId: string) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      rental: {
        include: {
          rentalItems: {
            include: {
              gearItem: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  if (!payment) {
    throw new AppError(404, "Payment not found.");
  }

  if (payment.rental.customerId !== userId) {
    throw new AppError(403, "You do not have permission to view this payment.");
  }

  return payment;
};

export const paymentService = {
  createPayment,
  confirmPayment,
  getUserPayments,
  getPaymentById,
};
