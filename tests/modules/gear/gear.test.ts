import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import app from "../../../src/app";
import { setupTestDb } from "../../helpers";
import { prisma } from "../../../src/lib/prisma";

type ApiResponse<T = any> = { success: boolean; statusCode: number; message: string; data: T };
type GearItem = { id: string; name: string; pricePerDay: string; brand: string | null };

let server: ReturnType<typeof app.listen>;
let baseUrl: string;
let providerToken: string;
let customerToken: string;
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
  providerToken = await registerAndLogin("Provider", `gp-${Date.now()}@example.com`, "PROVIDER");
  customerToken = await registerAndLogin("Customer", `gc-${Date.now()}@example.com`, "CUSTOMER");

  const cat = await prisma.category.create({
    data: { name: `Cycling ${Date.now()}` },
  });
  categoryId = cat.id;
});

describe("Gear Module - Public", () => {
  describe("GET /api/gear", () => {
    it("should return all available gear with pagination", async () => {
      // Create some gear first via provider
      await fetch(`${baseUrl}/api/provider/gear`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${providerToken}`,
        },
        body: JSON.stringify({
          name: "Mountain Bike",
          pricePerDay: 25.0,
          stockQuantity: 5,
          categoryId,
          brand: "Trek",
        }),
      });

      const res = await fetch(`${baseUrl}/api/gear`);
      const json = (await res.json()) as ApiResponse<GearItem[]> & { meta: { page: number; limit: number; total: number } };
      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.length).toBe(1);
      expect(json.data[0]!.name).toBe("Mountain Bike");
    });

    it("should filter gear by category", async () => {
      const cat2 = await prisma.category.create({ data: { name: "Camping" } });

      await fetch(`${baseUrl}/api/provider/gear`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${providerToken}`,
        },
        body: JSON.stringify({ name: "Tent", pricePerDay: 15, stockQuantity: 3, categoryId: cat2.id }),
      });

      const res = await fetch(`${baseUrl}/api/gear?categoryId=${cat2.id}`);
      const json = (await res.json()) as ApiResponse<GearItem[]>;
      expect(json.data.length).toBe(1);
      expect(json.data[0]!.name).toBe("Tent");
    });

    it("should filter by price range", async () => {
      await fetch(`${baseUrl}/api/provider/gear`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${providerToken}`,
        },
        body: JSON.stringify({ name: "Cheap Gloves", pricePerDay: 5, stockQuantity: 10, categoryId }),
      });

      const res = await fetch(`${baseUrl}/api/gear?minPrice=1&maxPrice=10`);
      const json = (await res.json()) as ApiResponse<GearItem[]>;
      expect(json.data.length).toBe(1);
    });

    it("should return empty for out-of-range price filter", async () => {
      await fetch(`${baseUrl}/api/provider/gear`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${providerToken}`,
        },
        body: JSON.stringify({ name: "Expensive", pricePerDay: 500, stockQuantity: 1, categoryId }),
      });

      const res = await fetch(`${baseUrl}/api/gear?minPrice=1000`);
      const json = (await res.json()) as ApiResponse<GearItem[]>;
      expect(json.data.length).toBe(0);
    });
  });

  describe("GET /api/gear/:id", () => {
    it("should return gear detail by id", async () => {
      const createRes = await fetch(`${baseUrl}/api/provider/gear`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${providerToken}`,
        },
        body: JSON.stringify({ name: "Road Bike", pricePerDay: 30, stockQuantity: 2, categoryId, brand: "Giant" }),
      });
      const created = (await createRes.json()) as ApiResponse<{ id: string }>;
      const gearId = created.data.id;

      const res = await fetch(`${baseUrl}/api/gear/${gearId}`);
      const json = (await res.json()) as ApiResponse<GearItem & { provider: { name: string } }>;
      expect(res.status).toBe(200);
      expect(json.data.name).toBe("Road Bike");
      expect(json.data.brand).toBe("Giant");
      expect(json.data.provider).toBeDefined();
    });

    it("should return 404 for nonexistent gear", async () => {
      const res = await fetch(`${baseUrl}/api/gear/nonexistent-id`);
      const json = (await res.json()) as ApiResponse;
      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
    });
  });
});

describe("Gear Module - Provider", () => {
  describe("POST /api/provider/gear", () => {
    it("should create gear as provider", async () => {
      const res = await fetch(`${baseUrl}/api/provider/gear`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${providerToken}`,
        },
        body: JSON.stringify({
          name: "Kayak",
          description: "Single-person kayak",
          pricePerDay: 40,
          stockQuantity: 3,
          categoryId,
          brand: "Ocean Kayak",
        }),
      });

      const json = (await res.json()) as ApiResponse<{ name: string; providerId: string }>;
      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.name).toBe("Kayak");
    });

    it("should fail when not authenticated", async () => {
      const res = await fetch(`${baseUrl}/api/provider/gear`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Kayak", pricePerDay: 40, stockQuantity: 3, categoryId }),
      });

      expect(res.status).toBe(401);
    });

    it("should fail when customer tries to create gear", async () => {
      const res = await fetch(`${baseUrl}/api/provider/gear`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({ name: "Kayak", pricePerDay: 40, stockQuantity: 3, categoryId }),
      });

      expect(res.status).toBe(403);
    });

    it("should fail with missing required fields", async () => {
      const res = await fetch(`${baseUrl}/api/provider/gear`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${providerToken}`,
        },
        body: JSON.stringify({ name: "Incomplete" }),
      });

      expect(res.status).toBe(400);
    });

    it("should fail with nonexistent category", async () => {
      const res = await fetch(`${baseUrl}/api/provider/gear`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${providerToken}`,
        },
        body: JSON.stringify({
          name: "Bad Category Gear",
          pricePerDay: 10,
          stockQuantity: 1,
          categoryId: "00000000-0000-0000-0000-000000000000",
        }),
      });

      const json = (await res.json()) as ApiResponse;
      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
    });
  });

  describe("PUT /api/provider/gear/:id", () => {
    it("should update own gear", async () => {
      const createRes = await fetch(`${baseUrl}/api/provider/gear`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${providerToken}`,
        },
        body: JSON.stringify({ name: "Old Name", pricePerDay: 20, stockQuantity: 2, categoryId }),
      });
      const created = (await createRes.json()) as ApiResponse<{ id: string }>;
      const gearId = created.data.id;

      const res = await fetch(`${baseUrl}/api/provider/gear/${gearId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${providerToken}`,
        },
        body: JSON.stringify({ name: "New Name", pricePerDay: 25 }),
      });

      const json = (await res.json()) as ApiResponse<{ name: string; pricePerDay: string }>;
      expect(res.status).toBe(200);
      expect(json.data.name).toBe("New Name");
    });

    it("should fail updating another provider's gear", async () => {
      const createRes = await fetch(`${baseUrl}/api/provider/gear`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${providerToken}`,
        },
        body: JSON.stringify({ name: "Protected", pricePerDay: 20, stockQuantity: 2, categoryId }),
      });
      const created = (await createRes.json()) as ApiResponse<{ id: string }>;

      const otherToken = await registerAndLogin("Other", `other-p-${Date.now()}@example.com`, "PROVIDER");

      const res = await fetch(`${baseUrl}/api/provider/gear/${created.data.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${otherToken}`,
        },
        body: JSON.stringify({ name: "Stolen" }),
      });

      expect(res.status).toBe(403);
    });
  });

  describe("DELETE /api/provider/gear/:id", () => {
    it("should delete own gear", async () => {
      const createRes = await fetch(`${baseUrl}/api/provider/gear`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${providerToken}`,
        },
        body: JSON.stringify({ name: "To Delete", pricePerDay: 10, stockQuantity: 1, categoryId }),
      });
      const created = (await createRes.json()) as ApiResponse<{ id: string }>;

      const res = await fetch(`${baseUrl}/api/provider/gear/${created.data.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${providerToken}` },
      });

      const json = (await res.json()) as ApiResponse;
      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
    });

    it("should fail deleting another provider's gear", async () => {
      const createRes = await fetch(`${baseUrl}/api/provider/gear`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${providerToken}`,
        },
        body: JSON.stringify({ name: "Protected Delete", pricePerDay: 10, stockQuantity: 1, categoryId }),
      });
      const created = (await createRes.json()) as ApiResponse<{ id: string }>;

      const otherToken = await registerAndLogin("Other2", `other2-${Date.now()}@example.com`, "PROVIDER");

      const res = await fetch(`${baseUrl}/api/provider/gear/${created.data.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${otherToken}` },
      });

      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/provider/gear", () => {
    it("should list provider's own gear", async () => {
      await fetch(`${baseUrl}/api/provider/gear`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${providerToken}`,
        },
        body: JSON.stringify({ name: "My Item 1", pricePerDay: 10, stockQuantity: 1, categoryId }),
      });
      await fetch(`${baseUrl}/api/provider/gear`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${providerToken}`,
        },
        body: JSON.stringify({ name: "My Item 2", pricePerDay: 20, stockQuantity: 2, categoryId }),
      });

      const res = await fetch(`${baseUrl}/api/provider/gear`, {
        headers: { Authorization: `Bearer ${providerToken}` },
      });
      const json = (await res.json()) as ApiResponse<GearItem[]>;
      expect(json.data.length).toBe(2);
    });
  });
});
