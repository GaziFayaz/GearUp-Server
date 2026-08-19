import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "bun:test";
import app from "../../../src/app";
import { setupTestDb } from "../../helpers";

type ApiResponse<T = any> = {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
};

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
};
type AuthData = { user: AuthUser; accessToken: string };

let server: ReturnType<typeof app.listen>;
let baseUrl: string;

async function registerUser(data: Record<string, unknown>): Promise<Response> {
  return fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      if (addr && typeof addr === "object") {
        baseUrl = `http://localhost:${addr.port}`;
      }
      resolve();
    });
  });
});

afterAll(() => {
  server?.close();
});

beforeEach(async () => {
  await setupTestDb();
});

describe("Auth Module", () => {
  describe("POST /api/auth/register", () => {
    it("should register a new customer successfully", async () => {
      const res = await registerUser({
        name: "John Doe",
        email: `john${Date.now()}@example.com`,
        password: "password123",
        role: "CUSTOMER",
      });

      const json = (await res.json()) as ApiResponse<AuthData>;
      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.user.email).toBeTruthy();
      expect(json.data.accessToken).toBeTruthy();
    });

    it("should register with default role as CUSTOMER when no role provided", async () => {
      const email = `norole${Date.now()}@example.com`;
      const res = await registerUser({
        name: "No Role User",
        email,
        password: "password123",
      });

      const json = (await res.json()) as ApiResponse<AuthData>;
      expect(res.status).toBe(201);
      expect(json.data.user.role).toBe("CUSTOMER");
    });

    it("should fail when required fields are missing", async () => {
      const res = await registerUser({
        email: `bad${Date.now()}@example.com`,
        password: "password123",
      });

      expect(res.status).toBe(400);
    });

    it("should fail when registering with duplicate email", async () => {
      const email = `dup${Date.now()}@example.com`;
      await registerUser({
        name: "First User",
        email,
        password: "password123",
      });

      const res = await registerUser({
        name: "Second User",
        email,
        password: "password123",
      });

      const json = (await res.json()) as ApiResponse;
      expect(res.status).toBe(409);
      expect(json.success).toBe(false);
    });

    it("should fail with invalid role", async () => {
      const res = await registerUser({
        name: "Bad Role",
        email: `badrole${Date.now()}@example.com`,
        password: "password123",
        role: "SUPERADMIN",
      });

      expect(res.status).toBe(400);
    });

    it("should fail with short password", async () => {
      const res = await registerUser({
        name: "Short Pass",
        email: `short${Date.now()}@example.com`,
        password: "ab",
      });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/auth/login", () => {
    it("should login with valid credentials", async () => {
      const email = `login${Date.now()}@example.com`;
      await registerUser({
        name: "Login User",
        email,
        password: "password123",
      });

      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "password123" }),
      });

      const json = (await res.json()) as ApiResponse<AuthData>;
      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.accessToken).toBeTruthy();
      expect(json.data.user.email).toBe(email);
    });

    it("should fail with wrong password", async () => {
      const email = `wrongpass${Date.now()}@example.com`;
      await registerUser({
        name: "Wrong Pass User",
        email,
        password: "password123",
      });

      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "wrongpassword" }),
      });

      const json = (await res.json()) as ApiResponse;
      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
    });

    it("should fail with nonexistent email", async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: `noexist${Date.now()}@example.com`,
          password: "password123",
        }),
      });

      const json = (await res.json()) as ApiResponse;
      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
    });
  });

  describe("GET /api/auth/me", () => {
    it("should return current user for valid token", async () => {
      const email = `me${Date.now()}@example.com`;
      const regRes = await registerUser({
        name: "Me User",
        email,
        password: "password123",
      });
      const regJson = (await regRes.json()) as ApiResponse<AuthData>;
      const token = regJson.data.accessToken;

      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = (await res.json()) as ApiResponse<AuthUser>;
      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.email).toBe(email);
    });

    it("should fail with no token", async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`);
      const json = (await res.json()) as ApiResponse;
      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
    });

    it("should fail with invalid token", async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: "Bearer invalidtoken" },
      });
      const json = (await res.json()) as ApiResponse;
      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
    });
  });

  describe("POST /api/auth/refresh-token", () => {
    it("should successfully refresh tokens with valid refresh token cookie", async () => {
      const email = `refresh${Date.now()}@example.com`;
      const regRes = await registerUser({
        name: "Refresh User",
        email,
        password: "password123",
      });
      const cookieHeader = regRes.headers.get("set-cookie") || "";
      expect(cookieHeader).toContain("refreshToken=");

      const res = await fetch(`${baseUrl}/api/auth/refresh-token`, {
        method: "POST",
        headers: {
          Cookie: cookieHeader,
        },
      });

      const json = (await res.json()) as ApiResponse<AuthData>;
      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.accessToken).toBeDefined();
      expect(json.data.user.email).toBe(email);
      expect(res.headers.get("set-cookie")).toContain("refreshToken=");
    });

    it("should successfully refresh tokens when passed in request body", async () => {
      const email = `refreshbody${Date.now()}@example.com`;
      const regRes = await registerUser({
        name: "Refresh Body User",
        email,
        password: "password123",
      });
      const cookieHeader = regRes.headers.get("set-cookie") || "";
      const match = cookieHeader.match(/refreshToken=([^;]+)/);
      const refreshToken = match ? match[1] : "";

      const res = await fetch(`${baseUrl}/api/auth/refresh-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      const json = (await res.json()) as ApiResponse<AuthData>;
      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.accessToken).toBeDefined();
    });

    it("should fail with 401 when refresh token is missing", async () => {
      const res = await fetch(`${baseUrl}/api/auth/refresh-token`, {
        method: "POST",
      });
      const json = (await res.json()) as ApiResponse;
      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
    });

    it("should fail with 401 when refresh token is invalid", async () => {
      const res = await fetch(`${baseUrl}/api/auth/refresh-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: "invalid-jwt-token" }),
      });
      const json = (await res.json()) as ApiResponse;
      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
    });
  });
});

