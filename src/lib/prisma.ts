import { PrismaPg } from "@prisma/adapter-pg";
import config from "../config/index.js";
import { PrismaClient } from "../../generated/prisma/client.js";

const connectionString = config.database_url || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ CRITICAL: DATABASE_URL is not defined in environment variables!");
}

const adapter = new PrismaPg({ connectionString: connectionString || "" });

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

