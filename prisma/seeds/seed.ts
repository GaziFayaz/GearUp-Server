import { prisma } from "../../src/lib/prisma";
import { jwtUtils } from "../../src/utils/jwt";
import config from "../../src/config";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";

// Deterministic IDs so collection endpoints can reference them
const SEED = {
  customerId: "c0000000-0000-4000-a000-000000000001",
  providerId: "c0000000-0000-4000-a000-000000000002",
  adminId: "c0000000-0000-4000-a000-000000000003",
  category1Id: "c0000000-0000-4000-a000-000000000010",
  category2Id: "c0000000-0000-4000-a000-000000000011",
  gear1Id: "c0000000-0000-4000-a000-000000000020",
  gear2Id: "c0000000-0000-4000-a000-000000000021",
  gear3Id: "c0000000-0000-4000-a000-000000000022",
  rental1Id: "c0000000-0000-4000-a000-000000000030",
  rentalItem1Id: "c0000000-0000-4000-a000-000000000031",
  rentalItem2Id: "c0000000-0000-4000-a000-000000000032",
  payment1Id: "c0000000-0000-4000-a000-000000000040",
  review1Id: "c0000000-0000-4000-a000-000000000050",
};

function generateToken(id: string, email: string, role: string) {
  return jwtUtils.createToken(
    { id, email, role },
    config.jwt_access_secret,
    { expiresIn: "365d" } as any,
  );
}

async function main() {
  console.log("Seeding GearUp database...\n");

  // Clean existing data
  await prisma.payment.deleteMany();
  await prisma.review.deleteMany();
  await prisma.rentalItem.deleteMany();
  await prisma.rentalOrder.deleteMany();
  await prisma.gearItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // Users (password: "password123")
  const passwordHash = await bcrypt.hash("password123", 12);

  const customer = await prisma.user.create({
    data: {
      id: SEED.customerId,
      name: "John Customer",
      email: "customer@gearup.test",
      password: passwordHash,
      role: "CUSTOMER",
      status: "ACTIVE",
    },
  });
  console.log(`Created customer: ${customer.email}`);

  const provider = await prisma.user.create({
    data: {
      id: SEED.providerId,
      name: "Jane Provider",
      email: "provider@gearup.test",
      password: passwordHash,
      role: "PROVIDER",
      status: "ACTIVE",
    },
  });
  console.log(`Created provider: ${provider.email}`);

  const admin = await prisma.user.create({
    data: {
      id: SEED.adminId,
      name: "Admin User",
      email: "admin@gearup.test",
      password: passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });
  console.log(`Created admin: ${admin.email}`);

  // Categories
  const cycling = await prisma.category.create({
    data: { id: SEED.category1Id, name: "Cycling", description: "Bicycles and cycling accessories" },
  });
  console.log(`Created category: ${cycling.name}`);

  const camping = await prisma.category.create({
    data: { id: SEED.category2Id, name: "Camping", description: "Tents, sleeping bags, and outdoor gear" },
  });
  console.log(`Created category: ${camping.name}`);

  // Gear Items
  const mtb = await prisma.gearItem.create({
    data: {
      id: SEED.gear1Id,
      name: "Mountain Bike Pro",
      description: "Full-suspension mountain bike, perfect for trails",
      brand: "Trek",
      pricePerDay: 35.00,
      stockQuantity: 5,
      isAvailable: true,
      categoryId: SEED.category1Id,
      providerId: SEED.providerId,
      imageUrls: ["https://example.com/bike1.jpg"],
      specifications: { frame: "Aluminum", wheelSize: "29-inch" },
    },
  });
  console.log(`Created gear: ${mtb.name}`);

  const tent = await prisma.gearItem.create({
    data: {
      id: SEED.gear2Id,
      name: "4-Person Camping Tent",
      description: "Waterproof tent with easy setup",
      brand: "Coleman",
      pricePerDay: 25.00,
      stockQuantity: 8,
      isAvailable: true,
      categoryId: SEED.category2Id,
      providerId: SEED.providerId,
      imageUrls: ["https://example.com/tent1.jpg"],
      specifications: { capacity: 4, weight: "4.5kg" },
    },
  });
  console.log(`Created gear: ${tent.name}`);

  const kayak = await prisma.gearItem.create({
    data: {
      id: SEED.gear3Id,
      name: "Recreational Kayak",
      description: "Single-person sit-on-top kayak",
      brand: "Ocean Kayak",
      pricePerDay: 40.00,
      stockQuantity: 3,
      isAvailable: true,
      categoryId: SEED.category2Id,
      providerId: SEED.providerId,
      imageUrls: ["https://example.com/kayak1.jpg"],
    },
  });
  console.log(`Created gear: ${kayak.name}`);

  // Rental Order with items
  const rental = await prisma.rentalOrder.create({
    data: {
      id: SEED.rental1Id,
      customerId: SEED.customerId,
      startDate: new Date("2026-07-10T00:00:00Z"),
      endDate: new Date("2026-07-13T00:00:00Z"),
      totalAmount: 210.00, // (35 * 2 * 3 days)
      status: "PENDING",
      rentalItems: {
        create: [
          {
            id: SEED.rentalItem1Id,
            gearItemId: SEED.gear1Id,
            quantity: 2,
            pricePerDay: 35.00,
          },
        ],
      },
    },
  });
  console.log(`Created rental order: ${rental.id} (status: ${rental.status})`);

  // Payment
  const payment = await prisma.payment.create({
    data: {
      id: SEED.payment1Id,
      rentalId: SEED.rental1Id,
      amount: 210.00,
      method: "STRIPE",
      status: "PENDING",
      transactionId: "txn_seed_001",
    },
  });
  console.log(`Created payment: ${payment.id} (status: ${payment.status})`);

  // Review
  const review = await prisma.review.create({
    data: {
      id: SEED.review1Id,
      customerId: SEED.customerId,
      gearItemId: SEED.gear1Id,
      rentalId: SEED.rental1Id,
      rating: 5,
      comment: "Amazing mountain bike! Handled trails perfectly.",
    },
  });
  console.log(`Created review: ${review.id} (rating: ${review.rating})`);

  // Generate tokens
  const customerToken = generateToken(SEED.customerId, "customer@gearup.test", "CUSTOMER");
  const providerToken = generateToken(SEED.providerId, "provider@gearup.test", "PROVIDER");
  const adminToken = generateToken(SEED.adminId, "admin@gearup.test", "ADMIN");

  console.log("\n========== SEED DATA SUMMARY ==========");
  console.log("Copy these values to api_collections/GearUp/environments/default.yml\n");
  console.log(`localurl:         http://localhost:4000`);
  console.log(`category1Id:      ${SEED.category1Id}`);
  console.log(`category2Id:      ${SEED.category2Id}`);
  console.log(`gear1Id:          ${SEED.gear1Id}  (Mountain Bike Pro)`);
  console.log(`gear2Id:          ${SEED.gear2Id}  (4-Person Camping Tent)`);
  console.log(`gear3Id:          ${SEED.gear3Id}  (Recreational Kayak)`);
  console.log(`rental1Id:        ${SEED.rental1Id}  (PENDING, 3 days)`);
  console.log(`payment1Id:       ${SEED.payment1Id}  (PENDING)`);
  console.log(`review1Id:        ${SEED.review1Id}  (5 stars)`);
  console.log(`customerId:       ${SEED.customerId}`);
  console.log(`providerId:       ${SEED.providerId}`);
  console.log(`adminId:          ${SEED.adminId}`);
  console.log(`\ncustomerToken:    ${customerToken}`);
  console.log(`providerToken:    ${providerToken}`);
  console.log(`adminToken:       ${adminToken}`);
  console.log("\n=======================================");

  // Auto-update environment file
  const envPath = path.join(process.cwd(), "api_collections/GearUp/environments/default.yml");
  const envContent = `name: default
variables:
  - name: localurl
    value: http://localhost:4000
  - name: customerEmail
    value: customer@gearup.test
  - name: providerEmail
    value: provider@gearup.test
  - name: adminEmail
    value: admin@gearup.test
  - name: password
    value: password123
  - name: customerId
    value: ${SEED.customerId}
  - name: providerId
    value: ${SEED.providerId}
  - name: adminId
    value: ${SEED.adminId}
  - name: category1Id
    value: ${SEED.category1Id}
  - name: category2Id
    value: ${SEED.category2Id}
  - name: gear1Id
    value: ${SEED.gear1Id}
  - name: gear2Id
    value: ${SEED.gear2Id}
  - name: gear3Id
    value: ${SEED.gear3Id}
  - name: rental1Id
    value: ${SEED.rental1Id}
  - name: payment1Id
    value: ${SEED.payment1Id}
  - name: review1Id
    value: ${SEED.review1Id}
  - name: customerToken
    value: ${customerToken}
  - name: providerToken
    value: ${providerToken}
  - name: adminToken
    value: ${adminToken}
`;
  fs.writeFileSync(envPath, envContent);
  console.log(`Updated environment file at api_collections/GearUp/environments/default.yml`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
