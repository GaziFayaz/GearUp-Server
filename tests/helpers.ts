import { prisma } from "../src/lib/prisma";

export async function setupTestDb() {
  // Data deletion completely removed to protect database data
}

export async function createTestUser(overrides: Record<string, unknown> = {}) {
  const email = `test${Date.now()}${Math.random().toString(36).slice(2)}@example.com`;
  return prisma.user.create({
    data: {
      name: "Test User",
      email,
      password: "$2a$12$LJ3m4ys3GZ0R5e4LuZxXmODBkHDWvQCpXhKTbJmBcHLjVq8jS2W8K",
      role: "CUSTOMER",
      status: "ACTIVE",
      ...overrides,
    } as any,
  });
}
