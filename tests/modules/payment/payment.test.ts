import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import app from "../../../src/app";
import { setupTestDb } from "../../helpers";
import { prisma } from "../../../src/lib/prisma";

type ApiResponse<T = any> = { success: boolean; statusCode: number; message: string; data: T };

let server: ReturnType<typeof app.listen>;
let baseUrl: string;
let customerToken: string;
let providerToken: string;
let gearId: string;
let categoryId: string;
let rentalId: string;

async function registerAndLogin(name: string, email: string, role: string): Promise<string> {
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password: "password123", role }),
  });
  const json = (await res.json()) as ApiResponse<{ accessToken: string }>;
  return json.data.accessToken;
}

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      if (addr && typeof addr === "object") baseUrl = `http://localhost:${addr.port}`;
      resolve();
    });
  });
});

afterAll(() => {
  server?.close();
});

beforeEach(async () => {
  await setupTestDb();
  customerToken = await registerAndLogin("Customer", `pc-${Date.now()}@example.com`, "CUSTOMER");
  providerToken = await registerAndLogin("Provider", `pp-${Date.now()}@example.com`, "PROVIDER");

  const cat = await prisma.category.create({ data: { name: `Water Sports ${Date.now()}` } });
  categoryId = cat.id;

  const createGear = await fetch(`${baseUrl}/api/provider/gear`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${providerToken}` },
    body: JSON.stringify({ name: "Surfboard", pricePerDay: 30, stockQuantity: 5, categoryId }),
  });
  const gearData = (await createGear.json()) as ApiResponse<{ id: string }>;
  gearId = gearData.data.id;

  const createRental = await fetch(`${baseUrl}/api/rentals`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({
      startDate: new Date(Date.now() + 86400000).toISOString(),
      endDate: new Date(Date.now() + 86400000 * 3).toISOString(),
      items: [{ gearItemId: gearId, quantity: 1 }],
    }),
  });
  const rentalData = (await createRental.json()) as ApiResponse<{ id: string }>;
  rentalId = rentalData.data.id;
});

describe("Payment Module", () => {
  describe("POST /api/payments/create", () => {
    it("should create a payment for a rental order", async () => {
      const res = await fetch(`${baseUrl}/api/payments/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({ rentalId, method: "STRIPE" }),
      });

      const json = (await res.json()) as ApiResponse<{ status: string; method: string; amount: string }>;
      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("PENDING");
      expect(json.data.method).toBe("STRIPE");
    });

    it("should fail for nonexistent rental", async () => {
      const res = await fetch(`${baseUrl}/api/payments/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({ rentalId: "00000000-0000-0000-0000-000000000000", method: "STRIPE" }),
      });

      expect(res.status).toBe(404);
    });

    it("should fail when rental belongs to another user", async () => {
      const otherToken = await registerAndLogin("Other", `po-${Date.now()}@example.com`, "CUSTOMER");

      const res = await fetch(`${baseUrl}/api/payments/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${otherToken}` },
        body: JSON.stringify({ rentalId, method: "STRIPE" }),
      });

      expect(res.status).toBe(403);
    });

    it("should fail when a completed payment already exists", async () => {
      await fetch(`${baseUrl}/api/payments/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({ rentalId, method: "STRIPE" }),
      });

      const res = await fetch(`${baseUrl}/api/payments/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({ rentalId, method: "STRIPE" }),
      });

      expect(res.status).toBe(400);
    });

    it("should fail without authentication", async () => {
      const res = await fetch(`${baseUrl}/api/payments/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rentalId, method: "STRIPE" }),
      });

      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/payments/confirm", () => {
    it("should confirm a pending payment", async () => {
      const createRes = await fetch(`${baseUrl}/api/payments/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({ rentalId, method: "STRIPE" }),
      });
      const paymentData = (await createRes.json()) as ApiResponse<{ id: string }>;

      const res = await fetch(`${baseUrl}/api/payments/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({ paymentId: paymentData.data.id }),
      });

      const json = (await res.json()) as ApiResponse<{ status: string }>;
      expect(res.status).toBe(200);
      expect(json.data.status).toBe("COMPLETED");
    });

    it("should fail confirming already completed payment", async () => {
      const createRes = await fetch(`${baseUrl}/api/payments/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({ rentalId, method: "STRIPE" }),
      });
      const paymentData = (await createRes.json()) as ApiResponse<{ id: string }>;

      await fetch(`${baseUrl}/api/payments/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({ paymentId: paymentData.data.id }),
      });

      const res = await fetch(`${baseUrl}/api/payments/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({ paymentId: paymentData.data.id }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/payments", () => {
    it("should list user's payment history", async () => {
      await fetch(`${baseUrl}/api/payments/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({ rentalId, method: "STRIPE" }),
      });

      const res = await fetch(`${baseUrl}/api/payments`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      const json = (await res.json()) as ApiResponse<any[]>;
      expect(res.status).toBe(200);
      expect(json.data.length).toBe(1);
    });
  });

  describe("GET /api/payments/:id", () => {
    it("should get payment detail", async () => {
      const createRes = await fetch(`${baseUrl}/api/payments/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({ rentalId, method: "STRIPE" }),
      });
      const paymentData = (await createRes.json()) as ApiResponse<{ id: string }>;

      const res = await fetch(`${baseUrl}/api/payments/${paymentData.data.id}`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      const json = (await res.json()) as ApiResponse<{ id: string; amount: string }>;
      expect(res.status).toBe(200);
      expect(json.data.id).toBe(paymentData.data.id);
    });
  });
});
