import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import app from "../../../src/app";
import { setupTestDb } from "../../helpers";
import { prisma } from "../../../src/lib/prisma";

type ApiResponse<T = any> = { success: boolean; statusCode: number; message: string; data: T };

let server: ReturnType<typeof app.listen>;
let baseUrl: string;
let adminToken: string;
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
  customerToken = await registerAndLogin("Customer", `ac-${Date.now()}@example.com`, "CUSTOMER");

  // Create admin via DB directly since register only allows CUSTOMER/PROVIDER
  const adminEmail = `admin-${Date.now()}@example.com`;
  const adminTokenRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Admin", email: adminEmail, password: "password123", role: "PROVIDER" }),
  });
  const admJson = (await adminTokenRes.json()) as ApiResponse<{ user: { id: string } }>;
  await prisma.user.update({ where: { id: admJson.data.user.id }, data: { role: "ADMIN" } });

  adminToken = await registerAndLogin("Admin2", `admin2-${Date.now()}@example.com`, "PROVIDER");
  const admJson2 = (await (await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: adminEmail, password: "password123" }),
  })).json()) as ApiResponse<{ accessToken: string }>;
  adminToken = admJson2.data.accessToken;

  const cat = await prisma.category.create({ data: { name: `Test Cat ${Date.now()}` } });
  categoryId = cat.id;
});

describe("Admin Module", () => {
  describe("GET /api/admin/users", () => {
    it("should list all users as admin", async () => {
      const res = await fetch(`${baseUrl}/api/admin/users`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const json = (await res.json()) as ApiResponse<any[]>;
      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);
    });

    it("should fail for non-admin users", async () => {
      const res = await fetch(`${baseUrl}/api/admin/users`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      expect(res.status).toBe(403);
    });
  });

  describe("PATCH /api/admin/users/:id", () => {
    it("should suspend a user", async () => {
      const customersRes = await fetch(`${baseUrl}/api/admin/users`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const customers = (await customersRes.json()) as ApiResponse<any[]>;
      const targetUser = customers.data.find((u: any) => u.role === "CUSTOMER");
      expect(targetUser).toBeDefined();

      const res = await fetch(`${baseUrl}/api/admin/users/${targetUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ status: "SUSPENDED" }),
      });

      const json = (await res.json()) as ApiResponse<{ status: string }>;
      expect(res.status).toBe(200);
      expect(json.data.status).toBe("SUSPENDED");
    });
  });

  describe("POST /api/admin/categories", () => {
    it("should create a category", async () => {
      const res = await fetch(`${baseUrl}/api/admin/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ name: `New Category ${Date.now()}`, description: "Test" }),
      });

      const json = (await res.json()) as ApiResponse<{ name: string }>;
      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
    });
  });

  describe("GET /api/admin/stats", () => {
    it("should return platform stats", async () => {
      const res = await fetch(`${baseUrl}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const json = (await res.json()) as ApiResponse<{ totalUsers: number }>;
      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(typeof json.data.totalUsers).toBe("number");
    });
  });
});
