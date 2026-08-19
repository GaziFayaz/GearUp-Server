import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
} from "bun:test";
import app from "../../../src/app";
import { setupTestDb } from "../../helpers";
import { prisma } from "../../../src/lib/prisma";
import { stripe } from "../../../src/lib/stripe";
import config from "../../../src/config";

type ApiResponse<T = any> = {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
};

let server: ReturnType<typeof app.listen>;
let baseUrl: string;
let customerToken: string;
let customerId: string;
let providerToken: string;
let gearId: string;
let categoryId: string;

async function registerAndLogin(
  name: string,
  email: string,
  role: string,
): Promise<{ token: string; userId: string }> {
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password: "password123", role }),
  });
  const json = (await res.json()) as ApiResponse<{ accessToken: string; user: { id: string } }>;
  return { token: json.data.accessToken, userId: json.data.user.id };
}

async function createRentalForTest(token: string): Promise<string> {
  const res = await fetch(`${baseUrl}/api/rentals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      startDate: new Date(Date.now() + 86400000).toISOString(),
      endDate: new Date(Date.now() + 86400000 * 3).toISOString(),
      items: [{ gearItemId: gearId, quantity: 1 }],
    }),
  });
  const json = (await res.json()) as ApiResponse<{ id: string }>;
  return json.data.id;
}

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      if (addr && typeof addr === "object")
        baseUrl = `http://localhost:${addr.port}`;
      resolve();
    });
  });

  await setupTestDb();

  const c = await registerAndLogin(
    "Customer",
    `pc-${Date.now()}@example.com`,
    "CUSTOMER",
  );
  customerToken = c.token;
  customerId = c.userId;

  const p = await registerAndLogin(
    "Provider",
    `pp-${Date.now()}@example.com`,
    "PROVIDER",
  );
  providerToken = p.token;

  const cat = await prisma.category.create({
    data: { name: `Water Sports ${Date.now()}` },
  });
  categoryId = cat.id;

  const createGear = await fetch(`${baseUrl}/api/provider/gear`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${providerToken}`,
    },
    body: JSON.stringify({
      name: "Surfboard",
      pricePerDay: 30,
      stockQuantity: 50,
      categoryId,
    }),
  });
  const gearData = (await createGear.json()) as ApiResponse<{ id: string }>;
  gearId = gearData.data.id;

  // Setup Stripe mock
  stripe.checkout = {
    sessions: {
      create: async (params: any) => ({
        id: `cs_test_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        url: `https://checkout.stripe.com/c/pay/cs_test_mock`,
        payment_status: "unpaid",
        metadata: params.metadata,
        client_reference_id: params.client_reference_id,
      }),
      retrieve: async (sessionId: string) => ({
        id: sessionId,
        payment_status: "paid",
        payment_intent: `pi_test_${Date.now()}`,
        metadata: {
          customerId,
        },
      }),
    },
  } as any;

  stripe.webhooks = {
    constructEvent: (rawBody: Buffer, _sig: string, _secret: string) => {
      const data = JSON.parse(rawBody.toString());
      return data;
    },
  } as any;

  config.stripe_webhook_secret = "whsec_test_mock_12345";
}, 30000);

afterAll(() => {
  server?.close();
});

describe("Payment Module", () => {
  describe("POST /api/payments/create-checkout-session", () => {
    it("should create a Stripe Checkout Session for a valid rental order", async () => {
      const rentalId = await createRentalForTest(customerToken);

      const res = await fetch(`${baseUrl}/api/payments/create-checkout-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({ rentalId }),
      });

      const json = (await res.json()) as ApiResponse<{
        checkoutUrl: string;
        sessionId: string;
        paymentId: string;
      }>;

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.checkoutUrl).toContain("checkout.stripe.com");
      expect(json.data.sessionId).toBeDefined();
      expect(json.data.paymentId).toBeDefined();

      const payment = await prisma.payment.findUnique({
        where: { id: json.data.paymentId },
      });
      expect(payment).toBeDefined();
      expect(payment?.status).toBe("PENDING");
      expect(payment?.transactionId).toBe(json.data.sessionId);
    }, 20000);

    it("should fail for nonexistent rental order", async () => {
      const res = await fetch(`${baseUrl}/api/payments/create-checkout-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          rentalId: "00000000-0000-0000-0000-000000000000",
        }),
      });

      expect(res.status).toBe(404);
    }, 20000);

    it("should fail when rental order belongs to another customer", async () => {
      const rentalId = await createRentalForTest(customerToken);
      const other = await registerAndLogin(
        "Other",
        `po-${Date.now()}@example.com`,
        "CUSTOMER",
      );

      const res = await fetch(`${baseUrl}/api/payments/create-checkout-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${other.token}`,
        },
        body: JSON.stringify({ rentalId }),
      });

      expect(res.status).toBe(403);
    }, 20000);
  });

  describe("GET /api/payments/verify-session", () => {
    it("should verify a paid Stripe session and transition order to PAID", async () => {
      const rentalId = await createRentalForTest(customerToken);

      const sessionRes = await fetch(`${baseUrl}/api/payments/create-checkout-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({ rentalId }),
      });
      const sessionData = (await sessionRes.json()) as ApiResponse<{
        sessionId: string;
      }>;

      // Update mock retrieve for this rental
      (stripe.checkout.sessions.retrieve as any) = async (sessionId: string) => ({
        id: sessionId,
        payment_status: "paid",
        payment_intent: `pi_test_${Date.now()}`,
        metadata: {
          rentalId,
          customerId,
        },
        client_reference_id: rentalId,
      });

      const res = await fetch(
        `${baseUrl}/api/payments/verify-session?sessionId=${sessionData.data.sessionId}`,
        {
          headers: {
            Authorization: `Bearer ${customerToken}`,
          },
        },
      );

      const json = (await res.json()) as ApiResponse<{
        isPaid: boolean;
        rentalId: string;
        payment: { status: string };
      }>;

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.isPaid).toBe(true);

      const rental = await prisma.rentalOrder.findUnique({
        where: { id: rentalId },
      });
      expect(rental?.status).toBe("PAID");
    }, 20000);
  });

  describe("POST /api/payments/webhook", () => {
    it("should process checkout.session.completed webhook and transition order to PAID", async () => {
      const rentalId = await createRentalForTest(customerToken);

      const sessionRes = await fetch(`${baseUrl}/api/payments/create-checkout-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({ rentalId }),
      });
      const sessionData = (await sessionRes.json()) as ApiResponse<{
        sessionId: string;
        paymentId: string;
      }>;

      const mockEvent = {
        type: "checkout.session.completed",
        data: {
          object: {
            id: sessionData.data.sessionId,
            payment_status: "paid",
            payment_intent: "pi_webhook_success_123",
            metadata: {
              rentalId,
              paymentId: sessionData.data.paymentId,
              customerId,
            },
          },
        },
      };

      const res = await fetch(`${baseUrl}/api/payments/webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "stripe-signature": "t=123,v1=mock_signature",
        },
        body: JSON.stringify(mockEvent),
      });

      expect(res.status).toBe(200);

      const rental = await prisma.rentalOrder.findUnique({
        where: { id: rentalId },
      });
      expect(rental?.status).toBe("PAID");

      const payment = await prisma.payment.findUnique({
        where: { id: sessionData.data.paymentId },
      });
      expect(payment?.status).toBe("COMPLETED");
      expect(payment?.transactionId).toBe("pi_webhook_success_123");
    }, 20000);
  });

  describe("POST /api/payments/create (Legacy Mock)", () => {
    it("should create a payment for a rental order", async () => {
      const rentalId = await createRentalForTest(customerToken);

      const res = await fetch(`${baseUrl}/api/payments/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({ rentalId, method: "STRIPE" }),
      });

      const json = (await res.json()) as ApiResponse<{
        status: string;
        method: string;
        amount: string;
      }>;
      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("PENDING");
      expect(json.data.method).toBe("STRIPE");
    }, 20000);
  });

  describe("POST /api/payments/confirm (Legacy Mock)", () => {
    it("should confirm a pending payment and transition order to PAID", async () => {
      const rentalId = await createRentalForTest(customerToken);

      const createRes = await fetch(`${baseUrl}/api/payments/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({ rentalId, method: "STRIPE" }),
      });
      const paymentData = (await createRes.json()) as ApiResponse<{
        id: string;
      }>;

      const res = await fetch(`${baseUrl}/api/payments/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({ paymentId: paymentData.data.id }),
      });

      const json = (await res.json()) as ApiResponse<{ status: string }>;
      expect(res.status).toBe(200);
      expect(json.data.status).toBe("COMPLETED");

      const rentalRes = await fetch(`${baseUrl}/api/rentals/${rentalId}`, {
        headers: {
          Authorization: `Bearer ${customerToken}`,
        },
      });
      const rentalJson = (await rentalRes.json()) as ApiResponse<{ status: string }>;
      expect(rentalJson.data.status).toBe("PAID");
    }, 20000);
  });

  describe("GET /api/payments", () => {
    it("should list user's payment history", async () => {
      const rentalId = await createRentalForTest(customerToken);

      await fetch(`${baseUrl}/api/payments/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({ rentalId, method: "STRIPE" }),
      });

      const res = await fetch(`${baseUrl}/api/payments`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      const json = (await res.json()) as ApiResponse<any[]>;
      expect(res.status).toBe(200);
      expect(json.data.length).toBeGreaterThanOrEqual(1);
    }, 20000);
  });

  describe("GET /api/payments/:id", () => {
    it("should get payment detail", async () => {
      const rentalId = await createRentalForTest(customerToken);

      const createRes = await fetch(`${baseUrl}/api/payments/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({ rentalId, method: "STRIPE" }),
      });
      const paymentData = (await createRes.json()) as ApiResponse<{
        id: string;
      }>;

      const res = await fetch(
        `${baseUrl}/api/payments/${paymentData.data.id}`,
        {
          headers: { Authorization: `Bearer ${customerToken}` },
        },
      );
      const json = (await res.json()) as ApiResponse<{
        id: string;
        amount: string;
      }>;
      expect(res.status).toBe(200);
      expect(json.data.id).toBe(paymentData.data.id);
    }, 20000);
  });
});
