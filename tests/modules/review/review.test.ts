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
  customerToken = await registerAndLogin("Customer", `rc-${Date.now()}@example.com`, "CUSTOMER");
  providerToken = await registerAndLogin("Provider", `rp-${Date.now()}@example.com`, "PROVIDER");

  const cat = await prisma.category.create({ data: { name: `Camping ${Date.now()}` } });
  categoryId = cat.id;

  const createGear = await fetch(`${baseUrl}/api/provider/gear`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${providerToken}` },
    body: JSON.stringify({ name: "Tent", pricePerDay: 20, stockQuantity: 10, categoryId }),
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

describe("Review Module", () => {
  describe("POST /api/reviews", () => {
    it("should create a review", async () => {
      const res = await fetch(`${baseUrl}/api/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({ gearItemId: gearId, rentalId, rating: 5, comment: "Great gear!" }),
      });

      const json = (await res.json()) as ApiResponse<{ rating: number; comment: string }>;
      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.rating).toBe(5);
      expect(json.data.comment).toBe("Great gear!");
    });

    it("should fail with invalid rating", async () => {
      const res = await fetch(`${baseUrl}/api/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({ gearItemId: gearId, rentalId, rating: 10, comment: "Too high" }),
      });

      expect(res.status).toBe(400);
    });

    it("should fail when not authenticated", async () => {
      const res = await fetch(`${baseUrl}/api/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gearItemId: gearId, rentalId, rating: 3 }),
      });

      expect(res.status).toBe(401);
    });

    it("should fail with duplicate review", async () => {
      await fetch(`${baseUrl}/api/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({ gearItemId: gearId, rentalId, rating: 4 }),
      });

      const res = await fetch(`${baseUrl}/api/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({ gearItemId: gearId, rentalId, rating: 3 }),
      });

      expect(res.status).toBe(409);
    });
  });

  describe("GET /api/reviews/gear/:gearId", () => {
    it("should get all reviews for a gear item", async () => {
      await fetch(`${baseUrl}/api/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({ gearItemId: gearId, rentalId, rating: 5, comment: "Awesome!" }),
      });

      const res = await fetch(`${baseUrl}/api/reviews/gear/${gearId}`);
      const json = (await res.json()) as ApiResponse<{ reviews: any[]; averageRating: number; totalReviews: number }>;
      expect(res.status).toBe(200);
      expect(json.data.reviews.length).toBe(1);
      expect(json.data.totalReviews).toBe(1);
      expect(typeof json.data.averageRating).toBe("number");
    });
  });
});
