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
  customerToken = await registerAndLogin("Customer", `rc-${Date.now()}@example.com`, "CUSTOMER");
  providerToken = await registerAndLogin("Provider", `rp-${Date.now()}@example.com`, "PROVIDER");

  const cat = await prisma.category.create({ data: { name: `Camping ${Date.now()}` } });
  categoryId = cat.id;

  const createRes = await fetch(`${baseUrl}/api/provider/gear`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${providerToken}` },
    body: JSON.stringify({ name: "Tent", pricePerDay: 20, stockQuantity: 10, categoryId }),
  });
  const created = (await createRes.json()) as ApiResponse<{ id: string }>;
  gearId = created.data.id;
});

describe("Rental Module - Customer", () => {
  describe("POST /api/rentals", () => {
    it("should create a rental order", async () => {
      const res = await fetch(`${baseUrl}/api/rentals`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({
          startDate: new Date(Date.now() + 86400000).toISOString(),
          endDate: new Date(Date.now() + 86400000 * 4).toISOString(),
          items: [{ gearItemId: gearId, quantity: 2 }],
        }),
      });

      const json = (await res.json()) as ApiResponse<{ totalAmount: string; status: string; rentalItems: any[] }>;
      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("PENDING");
      expect(json.data.rentalItems.length).toBe(1);
    });

    it("should fail when gear is not available", async () => {
      await prisma.gearItem.update({ where: { id: gearId }, data: { isAvailable: false } });

      const res = await fetch(`${baseUrl}/api/rentals`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({
          startDate: new Date(Date.now() + 86400000).toISOString(),
          endDate: new Date(Date.now() + 86400000 * 3).toISOString(),
          items: [{ gearItemId: gearId, quantity: 1 }],
        }),
      });

      expect(res.status).toBe(400);
    });

    it("should fail with insufficient stock", async () => {
      const res = await fetch(`${baseUrl}/api/rentals`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({
          startDate: new Date(Date.now() + 86400000).toISOString(),
          endDate: new Date(Date.now() + 86400000 * 3).toISOString(),
          items: [{ gearItemId: gearId, quantity: 999 }],
        }),
      });

      expect(res.status).toBe(400);
    });

    it("should fail with endDate before startDate", async () => {
      const res = await fetch(`${baseUrl}/api/rentals`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({
          startDate: new Date(Date.now() + 86400000 * 5).toISOString(),
          endDate: new Date(Date.now() + 86400000).toISOString(),
          items: [{ gearItemId: gearId, quantity: 1 }],
        }),
      });

      expect(res.status).toBe(400);
    });

    it("should fail without authentication", async () => {
      const res = await fetch(`${baseUrl}/api/rentals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
          items: [],
        }),
      });

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/rentals", () => {
    it("should list customer's own orders", async () => {
      await fetch(`${baseUrl}/api/rentals`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({
          startDate: new Date(Date.now() + 86400000).toISOString(),
          endDate: new Date(Date.now() + 86400000 * 3).toISOString(),
          items: [{ gearItemId: gearId, quantity: 1 }],
        }),
      });

      const res = await fetch(`${baseUrl}/api/rentals`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      const json = (await res.json()) as ApiResponse<any[]>;
      expect(res.status).toBe(200);
      expect(json.data.length).toBe(1);
    });
  });

  describe("GET /api/rentals/:id", () => {
    it("should get rental order detail", async () => {
      const createRes = await fetch(`${baseUrl}/api/rentals`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({
          startDate: new Date(Date.now() + 86400000).toISOString(),
          endDate: new Date(Date.now() + 86400000 * 3).toISOString(),
          items: [{ gearItemId: gearId, quantity: 2 }],
        }),
      });
      const created = (await createRes.json()) as ApiResponse<{ id: string }>;

      const res = await fetch(`${baseUrl}/api/rentals/${created.data.id}`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      const json = (await res.json()) as ApiResponse<{ id: string; rentalItems: any[] }>;
      expect(res.status).toBe(200);
      expect(json.data.rentalItems.length).toBe(1);
    });
  });
});

describe("Rental Module - Provider", () => {
  describe("GET /api/provider/orders", () => {
    it("should list provider's incoming orders", async () => {
      await fetch(`${baseUrl}/api/rentals`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({
          startDate: new Date(Date.now() + 86400000).toISOString(),
          endDate: new Date(Date.now() + 86400000 * 3).toISOString(),
          items: [{ gearItemId: gearId, quantity: 1 }],
        }),
      });

      const res = await fetch(`${baseUrl}/api/provider/orders`, {
        headers: { Authorization: `Bearer ${providerToken}` },
      });
      const json = (await res.json()) as ApiResponse<any[]>;
      expect(res.status).toBe(200);
      expect(json.data.length).toBe(1);
    });
  });

  describe("PATCH /api/provider/orders/:id", () => {
    it("should confirm an order", async () => {
      const createRes = await fetch(`${baseUrl}/api/rentals`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({
          startDate: new Date(Date.now() + 86400000).toISOString(),
          endDate: new Date(Date.now() + 86400000 * 3).toISOString(),
          items: [{ gearItemId: gearId, quantity: 1 }],
        }),
      });
      const created = (await createRes.json()) as ApiResponse<{ id: string }>;

      const res = await fetch(`${baseUrl}/api/provider/orders/${created.data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${providerToken}` },
        body: JSON.stringify({ status: "CONFIRMED" }),
      });

      const json = (await res.json()) as ApiResponse<{ status: string }>;
      expect(res.status).toBe(200);
      expect(json.data.status).toBe("CONFIRMED");
    });

    it("should fail with invalid status transition", async () => {
      const createRes = await fetch(`${baseUrl}/api/rentals`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({
          startDate: new Date(Date.now() + 86400000).toISOString(),
          endDate: new Date(Date.now() + 86400000 * 3).toISOString(),
          items: [{ gearItemId: gearId, quantity: 1 }],
        }),
      });
      const created = (await createRes.json()) as ApiResponse<{ id: string }>;

      // Try to set PICKED_UP before CONFIRMED
      const res = await fetch(`${baseUrl}/api/provider/orders/${created.data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${providerToken}` },
        body: JSON.stringify({ status: "PICKED_UP" }),
      });

      expect(res.status).toBe(400);
    });
  });
});
