import { prisma } from "../../lib/prisma.js";
import { stripe } from "../../lib/stripe.js";
import config from "../../config/index.js";
import AppError from "../../utils/AppError.js";
import type Stripe from "stripe";

const createCheckoutSession = async (
  customerId: string,
  rentalId: string,
) => {
  const rental = await prisma.rentalOrder.findUnique({
    where: { id: rentalId },
    include: {
      payments: true,
      customer: { select: { id: true, name: true, email: true } },
      rentalItems: {
        include: {
          gearItem: {
            select: { id: true, name: true, pricePerDay: true, imageUrls: true },
          },
        },
      },
    },
  });

  if (!rental) {
    throw new AppError(404, "Rental order not found.");
  }

  if (rental.customerId !== customerId) {
    throw new AppError(403, "You can only pay for your own rentals.");
  }

  if (rental.status === "CANCELLED" || rental.status === "RETURNED") {
    throw new AppError(400, `Cannot pay for a rental in ${rental.status} status.`);
  }

  const existingCompleted = rental.payments.find(
    (p) => p.status === "COMPLETED",
  );
  if (existingCompleted || rental.status === "PAID") {
    throw new AppError(400, "This rental has already been paid.");
  }

  // Calculate rental duration in days (minimum 1 day)
  const rentalDays = Math.max(
    1,
    Math.ceil(
      (new Date(rental.endDate).getTime() -
        new Date(rental.startDate).getTime()) /
        (1000 * 60 * 60 * 24),
    ),
  );

  // Build line items for Stripe Checkout
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
    rental.rentalItems.map((item) => {
      const unitAmountInCents = Math.round(
        Number(item.pricePerDay) * rentalDays * 100,
      );
      const images: string[] = [];
      if (item.gearItem.imageUrls && item.gearItem.imageUrls.length > 0) {
        // Only include absolute URLs (http/https)
        const firstImg = item.gearItem.imageUrls[0];
        if (firstImg.startsWith("http://") || firstImg.startsWith("https://")) {
          images.push(firstImg);
        }
      }

      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: item.gearItem.name,
            description: `Rental Period: ${new Date(rental.startDate).toLocaleDateString()} - ${new Date(rental.endDate).toLocaleDateString()} (${rentalDays} day${rentalDays > 1 ? "s" : ""})`,
            images: images.length > 0 ? images : undefined,
          },
          unit_amount: unitAmountInCents,
        },
        quantity: item.quantity,
      };
    });

  // Find or create pending payment record
  let payment = rental.payments.find((p) => p.status === "PENDING");
  if (!payment) {
    payment = await prisma.payment.create({
      data: {
        rentalId,
        amount: rental.totalAmount,
        method: "STRIPE",
        status: "PENDING",
      },
    });
  }

  const appUrl = config.app_url || "http://localhost:3000";

  // Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    customer_email: rental.customer.email,
    client_reference_id: rental.id,
    metadata: {
      rentalId: rental.id,
      paymentId: payment.id,
      customerId,
    },
    line_items: lineItems,
    success_url: `${appUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}&rentalId=${rental.id}&paymentId=${payment.id}`,
    cancel_url: `${appUrl}/payment/cancel?rentalId=${rental.id}`,
  });

  // Store Stripe session ID on payment record
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      transactionId: session.id,
    },
  });

  return {
    checkoutUrl: session.url,
    sessionId: session.id,
    paymentId: payment.id,
  };
};

const verifySession = async (sessionId: string, userId: string) => {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent"],
  });

  if (!session) {
    throw new AppError(404, "Stripe checkout session not found.");
  }

  const rentalId = session.metadata?.rentalId || session.client_reference_id;
  const paymentId = session.metadata?.paymentId;

  if (!rentalId) {
    throw new AppError(400, "No rental order associated with this checkout session.");
  }

  const rental = await prisma.rentalOrder.findUnique({
    where: { id: rentalId },
    include: { payments: true },
  });

  if (!rental) {
    throw new AppError(404, "Associated rental order not found.");
  }

  if (rental.customerId !== userId) {
    throw new AppError(403, "You do not have permission to verify this payment.");
  }

  const isPaid = session.payment_status === "paid";

  if (isPaid) {
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id || session.id;

    // Atomically transition payment to COMPLETED and rental to PAID
    await prisma.$transaction(async (tx) => {
      if (paymentId) {
        await tx.payment.updateMany({
          where: { id: paymentId, status: { not: "COMPLETED" } },
          data: {
            status: "COMPLETED",
            transactionId: paymentIntentId,
            paidAt: new Date(),
          },
        });
      } else {
        await tx.payment.updateMany({
          where: { rentalId, status: { not: "COMPLETED" } },
          data: {
            status: "COMPLETED",
            transactionId: paymentIntentId,
            paidAt: new Date(),
          },
        });
      }

      await tx.rentalOrder.update({
        where: { id: rentalId },
        data: { status: "PAID" },
      });
    });
  }

  const updatedPayment = await prisma.payment.findFirst({
    where: { rentalId },
    orderBy: { createdAt: "desc" },
  });

  return {
    isPaid,
    paymentStatus: session.payment_status,
    sessionId: session.id,
    rentalId,
    payment: updatedPayment,
  };
};

const handleWebhook = async (rawBody: any, signature: string) => {
  const webhookSecret = config.stripe_webhook_secret;
  if (!webhookSecret) {
    throw new AppError(500, "Stripe webhook secret is not configured.");
  }

  let event: Stripe.Event;
  try {
    const payloadBuffer = Buffer.isBuffer(rawBody)
      ? rawBody
      : Buffer.from(
          typeof rawBody === "string" ? rawBody : JSON.stringify(rawBody),
        );
    event = stripe.webhooks.constructEvent(
      payloadBuffer,
      signature,
      webhookSecret,
    );
  } catch (err: any) {
    throw new AppError(400, `Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const rentalId = session.metadata?.rentalId || session.client_reference_id;
    const paymentId = session.metadata?.paymentId;
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id || session.id;

    if (rentalId) {
      await prisma.$transaction(async (tx) => {
        if (paymentId) {
          await tx.payment.updateMany({
            where: { id: paymentId, status: { not: "COMPLETED" } },
            data: {
              status: "COMPLETED",
              transactionId: paymentIntentId,
              paidAt: new Date(),
            },
          });
        } else {
          await tx.payment.updateMany({
            where: { rentalId, status: { not: "COMPLETED" } },
            data: {
              status: "COMPLETED",
              transactionId: paymentIntentId,
              paidAt: new Date(),
            },
          });
        }

        await tx.rentalOrder.update({
          where: { id: rentalId },
          data: { status: "PAID" },
        });
      });
    }
  }

  return { received: true, type: event.type };
};

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
  if (existingCompleted || rental.status === "PAID") {
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

  const updated = await prisma.$transaction(async (tx) => {
    const p = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: "COMPLETED",
        paidAt: new Date(),
      },
    });

    await tx.rentalOrder.update({
      where: { id: payment.rentalId },
      data: {
        status: "PAID",
      },
    });

    return p;
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
  createCheckoutSession,
  verifySession,
  handleWebhook,
  createPayment,
  confirmPayment,
  getUserPayments,
  getPaymentById,
};
