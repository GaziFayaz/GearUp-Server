import { prisma } from "../../src/lib/prisma";
import { jwtUtils } from "../../src/utils/jwt";
import config from "../../src/config";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";

// Deterministic IDs so collection endpoints, tests, and API environments can reference them reliably
const SEED = {
  // Primary accounts
  customerId: "c0000000-0000-4000-a000-000000000001",
  providerId: "c0000000-0000-4000-a000-000000000002",
  adminId: "c0000000-0000-4000-a000-000000000003",

  // Secondary providers & customers
  provider2Id: "c0000000-0000-4000-a000-000000000004",
  provider3Id: "c0000000-0000-4000-a000-000000000005",
  customer2Id: "c0000000-0000-4000-a000-000000000006",
  customer3Id: "c0000000-0000-4000-a000-000000000007",
  customer4Id: "c0000000-0000-4000-a000-000000000008",

  // Categories (exact matching names for frontend icons and routes)
  category1Id: "c0000000-0000-4000-a000-000000000010", // Camping & Hiking
  category2Id: "c0000000-0000-4000-a000-000000000011", // Water Sports
  category3Id: "c0000000-0000-4000-a000-000000000012", // Winter Sports
  category4Id: "c0000000-0000-4000-a000-000000000013", // Cycling & Bikes
  category5Id: "c0000000-0000-4000-a000-000000000014", // Climbing
  category6Id: "c0000000-0000-4000-a000-000000000015", // Fitness

  // Anchor Gear Items
  gear1Id: "c0000000-0000-4000-a000-000000000020",
  gear2Id: "c0000000-0000-4000-a000-000000000021",
  gear3Id: "c0000000-0000-4000-a000-000000000022",

  // Orders
  rental1Id: "c0000000-0000-4000-a000-000000000030",
  rental2Id: "c0000000-0000-4000-a000-000000000031",
  rental3Id: "c0000000-0000-4000-a000-000000000032",
  rental4Id: "c0000000-0000-4000-a000-000000000033",
  rental5Id: "c0000000-0000-4000-a000-000000000034",

  // Payments
  payment1Id: "c0000000-0000-4000-a000-000000000040",
  payment2Id: "c0000000-0000-4000-a000-000000000041",
  payment3Id: "c0000000-0000-4000-a000-000000000042",
  payment4Id: "c0000000-0000-4000-a000-000000000043",

  // Reviews
  review1Id: "c0000000-0000-4000-a000-000000000050",
  review2Id: "c0000000-0000-4000-a000-000000000051",
  review3Id: "c0000000-0000-4000-a000-000000000052",
  review4Id: "c0000000-0000-4000-a000-000000000053",
  review5Id: "c0000000-0000-4000-a000-000000000054",
  review6Id: "c0000000-0000-4000-a000-000000000055",
};

function generateToken(id: string, email: string, role: string) {
  return jwtUtils.createToken({ id, email, role }, config.jwt_access_secret, {
    expiresIn: "365d",
  } as any);
}

async function main() {
  console.log("Seeding GearUp database with full showcase demo dataset...\n");

  // 1. Clean existing data in relational order
  await prisma.payment.deleteMany();
  await prisma.review.deleteMany();
  await prisma.rentalItem.deleteMany();
  await prisma.rentalOrder.deleteMany();
  await prisma.gearItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 12);

  // 2. Users (Customers, Providers, Admin)
  const users = [
    {
      id: SEED.customerId,
      name: "John Customer",
      email: "customer@gearup.test",
      password: passwordHash,
      role: "CUSTOMER" as const,
      status: "ACTIVE" as const,
      profileImage:
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80",
    },
    {
      id: SEED.customer2Id,
      name: "Sarah Chen",
      email: "sarah.chen@gearup.test",
      password: passwordHash,
      role: "CUSTOMER" as const,
      status: "ACTIVE" as const,
      profileImage:
        "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=250&q=80",
    },
    {
      id: SEED.customer3Id,
      name: "Marcus Vance",
      email: "marcus.vance@gearup.test",
      password: passwordHash,
      role: "CUSTOMER" as const,
      status: "ACTIVE" as const,
      profileImage:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80",
    },
    {
      id: SEED.customer4Id,
      name: "Elena Rostova",
      email: "elena.rostova@gearup.test",
      password: passwordHash,
      role: "CUSTOMER" as const,
      status: "ACTIVE" as const,
      profileImage:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
    },
    {
      id: SEED.providerId,
      name: "Jane Provider (Trailhead Gear)",
      email: "provider@gearup.test",
      password: passwordHash,
      role: "PROVIDER" as const,
      status: "ACTIVE" as const,
      profileImage:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80",
    },
    {
      id: SEED.provider2Id,
      name: "Summit Adventure Outfitters",
      email: "summit.outfitters@gearup.test",
      password: passwordHash,
      role: "PROVIDER" as const,
      status: "ACTIVE" as const,
      profileImage:
        "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=250&q=80",
    },
    {
      id: SEED.provider3Id,
      name: "Alpine & Coast Rentals",
      email: "alpine.coast@gearup.test",
      password: passwordHash,
      role: "PROVIDER" as const,
      status: "ACTIVE" as const,
      profileImage:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=250&q=80",
    },
    {
      id: SEED.adminId,
      name: "Admin User",
      email: "admin@gearup.test",
      password: passwordHash,
      role: "ADMIN" as const,
      status: "ACTIVE" as const,
      profileImage:
        "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=250&q=80",
    },
  ];

  for (const u of users) {
    await prisma.user.create({ data: u });
  }
  console.log(`Created ${users.length} users across Customer, Provider, and Admin roles.`);

  // 3. Categories (All 6 activity categories matching frontend)
  const categories = [
    {
      id: SEED.category1Id,
      name: "Camping & Hiking",
      description: "Tents, sleeping bags, backpacks, camping stoves, and trekking poles for backcountry trips.",
      imageUrl:
        "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=1200&q=80",
    },
    {
      id: SEED.category2Id,
      name: "Water Sports",
      description: "Kayaks, stand-up paddleboards, life jackets, wetsuits, and snorkeling gear.",
      imageUrl:
        "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80",
    },
    {
      id: SEED.category3Id,
      name: "Winter Sports",
      description: "All-mountain skis, snowboards, boots, spherical anti-fog goggles, and winter mountaineering gear.",
      imageUrl:
        "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?auto=format&fit=crop&w=1200&q=80",
    },
    {
      id: SEED.category4Id,
      name: "Cycling & Bikes",
      description: "Road bikes, full-suspension mountain bikes, electric trail bikes, helmets, and repair kits.",
      imageUrl:
        "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=1200&q=80",
    },
    {
      id: SEED.category5Id,
      name: "Climbing",
      description: "Harnesses, dynamic ropes, locking carabiners, climbing shoes, and bouldering crash pads.",
      imageUrl:
        "https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&w=1200&q=80",
    },
    {
      id: SEED.category6Id,
      name: "Fitness",
      description: "Adjustable dumbbells, competition kettlebells, yoga gear, and portable training racks.",
      imageUrl:
        "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=1200&q=80",
    },
  ];

  for (const c of categories) {
    await prisma.category.create({ data: c });
  }
  console.log(`Created ${categories.length} categories.`);

  // 4. Gear Items (24 high-demand outdoor & sports gear listings with multi-image galleries)
  const gearItems = [
    // ----------------- Camping & Hiking -----------------
    {
      id: SEED.gear2Id,
      name: "Coleman 4-Person Waterproof Dome Tent",
      description:
        "Weatherproof 4-person dome tent featuring WeatherTec welded floors and inverted seams to keep rain outside. Setup takes under 10 minutes.",
      brand: "Coleman",
      pricePerDay: 28.0,
      stockQuantity: 6,
      isAvailable: true,
      categoryId: SEED.category1Id,
      providerId: SEED.providerId,
      imageUrls: [
        "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=800&q=80",
      ],
      specifications: {
        capacity: "4 People",
        dimensions: "9 x 7 ft with 4 ft 11 in center height",
        weight: "4.8 kg",
        season: "3-Season",
        included: ["Rainfly", "Ground stakes", "Carry bag"],
      },
    },
    {
      id: "c0000000-0000-4000-a000-000000000101",
      name: "Osprey Atmos AG 65L Expedition Backpack",
      description:
        "Award-winning backcountry backpacking pack equipped with Anti-Gravity suspension system for seamless weight distribution on multi-day treks.",
      brand: "Osprey",
      pricePerDay: 22.0,
      stockQuantity: 5,
      isAvailable: true,
      categoryId: SEED.category1Id,
      providerId: SEED.provider2Id,
      imageUrls: [
        "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?auto=format&fit=crop&w=800&q=80",
      ],
      specifications: {
        volume: "65 Liters",
        weight: "2.1 kg",
        torsoSize: "Medium/Large Adjustable",
        features: ["Integrated raincover", "Hydration reservoir sleeve", "Trekking pole attachment"],
      },
    },
    {
      id: "c0000000-0000-4000-a000-000000000102",
      name: "MSR PocketRocket 2 Ultralight Camp Stove Kit",
      description:
        "Compact, rapid-boiling backpacking stove kit with hard-anodized aluminum cook pot, folding handles, and piezo igniter.",
      brand: "MSR",
      pricePerDay: 14.0,
      stockQuantity: 8,
      isAvailable: true,
      categoryId: SEED.category1Id,
      providerId: SEED.providerId,
      imageUrls: [
        "https://images.unsplash.com/photo-1533873984035-25970ab07461?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&w=800&q=80",
      ],
      specifications: {
        boilTime: "1L in 3.5 mins",
        fuelType: "Isobutane-propane canister",
        weight: "73 g (stove only)",
        packSize: "Nesting 1.2L pot",
      },
    },
    {
      id: "c0000000-0000-4000-a000-000000000103",
      name: "Black Diamond Trail Pro Carbon Trekking Poles",
      description:
        "Lightweight 100% carbon fiber trekking poles with SmashLock quick-release technology and ergonomic dual-density foam grips.",
      brand: "Black Diamond",
      pricePerDay: 12.0,
      stockQuantity: 10,
      isAvailable: true,
      categoryId: SEED.category1Id,
      providerId: SEED.provider3Id,
      imageUrls: [
        "https://images.unsplash.com/photo-1519904981063-b0cf448d479e?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1501555088652-021faa106b9b?auto=format&fit=crop&w=800&q=80",
      ],
      specifications: {
        usableLength: "105 - 140 cm",
        collapsedLength: "65 cm",
        pairWeight: "490 g",
        material: "Carbon fiber + aluminum upper",
      },
    },

    // ----------------- Water Sports -----------------
    {
      id: SEED.gear3Id,
      name: "Ocean Kayak Malibu Two Tandem Kayak",
      description:
        "The world's most popular sit-on-top kayak. Stable, agile, and perfect for ocean surf, calm lakes, and lazy river paddling for 2 adults and gear.",
      brand: "Ocean Kayak",
      pricePerDay: 45.0,
      stockQuantity: 4,
      isAvailable: true,
      categoryId: SEED.category2Id,
      providerId: SEED.providerId,
      imageUrls: [
        "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=800&q=80",
      ],
      specifications: {
        length: "12 ft",
        capacity: "425 lbs (2 Persons)",
        weight: "68 lbs",
        included: ["2x Comfort Plus seat backs", "2x Lightweight aluminum paddles"],
      },
    },
    {
      id: "c0000000-0000-4000-a000-000000000104",
      name: "Retrospec Weekender 10' Inflatable SUP Board",
      description:
        "All-around inflatable stand-up paddleboard made with military-grade dual-layer PVC. Includes pump, fin, coil leash, and backpack.",
      brand: "Retrospec",
      pricePerDay: 36.0,
      stockQuantity: 6,
      isAvailable: true,
      categoryId: SEED.category2Id,
      providerId: SEED.provider3Id,
      imageUrls: [
        "https://images.unsplash.com/photo-1508873696983-2df5293cb32b?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1516762689617-e1cffcef479d?auto=format&fit=crop&w=800&q=80",
      ],
      specifications: {
        dimensions: "10' x 30\" x 6\"",
        maxRiderWeight: "275 lbs",
        inflationPressure: "15 PSI",
        accessories: ["3-piece adjustable paddle", "High-pressure pump", "Removable center fin"],
      },
    },
    {
      id: "c0000000-0000-4000-a000-000000000105",
      name: "O'Neill Reactor-2 3/2mm Full Wetsuit",
      description:
        "Engineered performance wetsuit made with UltraFlex neoprene. Ideal for surfing, open water paddling, and diving in moderate temperatures.",
      brand: "O'Neill",
      pricePerDay: 18.0,
      stockQuantity: 7,
      isAvailable: true,
      categoryId: SEED.category2Id,
      providerId: SEED.provider3Id,
      imageUrls: [
        "https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
      ],
      specifications: {
        thickness: "3/2 mm",
        material: "FluidFlex / UltraFlex Neoprene",
        entry: "Back Zip with leash",
        tempRange: "55°F - 68°F (13°C - 20°C)",
      },
    },
    {
      id: "c0000000-0000-4000-a000-000000000106",
      name: "NRS Chinook OS Fishing & Kayak Life Jacket",
      description:
        "Type III Coast Guard approved PFD designed specifically for kayak anglers and long-distance paddlers with deep storage pockets.",
      brand: "NRS",
      pricePerDay: 12.0,
      stockQuantity: 9,
      isAvailable: true,
      categoryId: SEED.category2Id,
      providerId: SEED.providerId,
      imageUrls: [
        "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
      ],
      specifications: {
        flotation: "16.5 lbs design flotation",
        certification: "USCG Type III",
        adjustmentPoints: "7 adjustment points",
        pockets: "5 exterior zippered pockets",
      },
    },

    // ----------------- Winter Sports -----------------
    {
      id: "c0000000-0000-4000-a000-000000000107",
      name: "Salomon QST 98 All-Mountain Skis + Bindings",
      description:
        "High-performance all-mountain skis featuring double sidewall technology and cork damplifier in the tip for smooth carving and powder float.",
      brand: "Salomon",
      pricePerDay: 55.0,
      stockQuantity: 4,
      isAvailable: true,
      categoryId: SEED.category3Id,
      providerId: SEED.provider2Id,
      imageUrls: [
        "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1565992441121-4367c2967103?auto=format&fit=crop&w=800&q=80",
      ],
      specifications: {
        length: "176 cm",
        waistWidth: "98 mm",
        rockerProfile: "All-Terrain Rocker",
        bindings: "Salomon Warden MNC 11 included",
      },
    },
    {
      id: "c0000000-0000-4000-a000-000000000108",
      name: "Burton Custom Camber Snowboard",
      description:
        "The most trusted board in snowboarding history. Precision camber profile with Super Fly II 700G core for high-speed mountain charging.",
      brand: "Burton",
      pricePerDay: 48.0,
      stockQuantity: 5,
      isAvailable: true,
      categoryId: SEED.category3Id,
      providerId: SEED.provider2Id,
      imageUrls: [
        "https://images.unsplash.com/photo-1482867996988-29ec3a0f1aac?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1522056615691-da7b8106829f?auto=format&fit=crop&w=800&q=80",
      ],
      specifications: {
        size: "158 cm",
        bend: "Camber",
        shape: "Directional Shape",
        flex: "Twin Flex",
        channelSystem: "The Channel mounting system",
      },
    },
    {
      id: "c0000000-0000-4000-a000-000000000109",
      name: "Smith I/O MAG ChromaPop Spherical Snow Goggles",
      description:
        "Magnetic quick-change lens system with ChromaPop color enhancement and 5X anti-fog inner thermal lens.",
      brand: "Smith Optics",
      pricePerDay: 16.0,
      stockQuantity: 8,
      isAvailable: true,
      categoryId: SEED.category3Id,
      providerId: SEED.provider2Id,
      imageUrls: [
        "https://images.unsplash.com/photo-1517999349371-c43520457b23?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1483921020237-2ff51e8e4b22?auto=format&fit=crop&w=800&q=80",
      ],
      specifications: {
        lensesIncluded: ["ChromaPop Sun Platinum Mirror", "ChromaPop Storm Rose Flash"],
        lensType: "Spherical Carbonic-x",
        fit: "Medium / Large",
        helmetCompatible: "Yes, ultra-wide silicone strap",
      },
    },
    {
      id: "c0000000-0000-4000-a000-000000000110",
      name: "K2 B.F.C. 100 Heat Ski Boots",
      description:
        "Hands-free entry all-day comfort ski boots with Therm-ic heated liners and GripWalk outsoles for icy parking lots and lodge walking.",
      brand: "K2",
      pricePerDay: 26.0,
      stockQuantity: 6,
      isAvailable: true,
      categoryId: SEED.category3Id,
      providerId: SEED.provider2Id,
      imageUrls: [
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1520639888713-7851133b1ed0?auto=format&fit=crop&w=800&q=80",
      ],
      specifications: {
        flexIndex: "100",
        lastWidth: "103 mm (Cushy Wide)",
        liner: "CushFit Liner with heating controls",
        soles: "GripWalk ISO 23223",
      },
    },

    // ----------------- Cycling & Bikes -----------------
    {
      id: SEED.gear1Id,
      name: "Trek Fuel EX 8 Full-Suspension Mountain Bike",
      description:
        "Versatile full-suspension trail bike built with Alpha Platinum Aluminum, 140mm Fox Float EVOL shock, and Shimano XT 12-speed drivetrain.",
      brand: "Trek",
      pricePerDay: 49.0,
      stockQuantity: 4,
      isAvailable: true,
      categoryId: SEED.category4Id,
      providerId: SEED.providerId,
      imageUrls: [
        "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?auto=format&fit=crop&w=800&q=80",
      ],
      specifications: {
        frame: "Alpha Platinum Aluminum",
        wheelSize: "29 inch Bontrager Line Comp 30",
        suspension: "Fox Rhythm 36 (150mm) / Fox Float EVOL (140mm)",
        brakes: "Shimano 4-piston hydraulic disc",
        gears: "1x12 Shimano XT",
      },
    },
    {
      id: "c0000000-0000-4000-a000-000000000111",
      name: "Specialized Tarmac SL7 Expert Road Bike",
      description:
        "Rider-First Engineered carbon road race bike with Shimano Ultegra Di2 electronic shifting and Roval C38 carbon wheels.",
      brand: "Specialized",
      pricePerDay: 58.0,
      stockQuantity: 3,
      isAvailable: true,
      categoryId: SEED.category4Id,
      providerId: SEED.provider3Id,
      imageUrls: [
        "https://images.unsplash.com/photo-1571068316344-75bc76f77890?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?auto=format&fit=crop&w=800&q=80",
      ],
      specifications: {
        frameMaterial: "FACT 10r Carbon",
        groupset: "Shimano Ultegra Di2 R8170 12-Speed",
        weight: "7.6 kg",
        size: "54 cm (Medium)",
      },
    },
    {
      id: "c0000000-0000-4000-a000-000000000112",
      name: "Specialized Turbo Levo Comp E-Mountain Bike",
      description:
        "Full-power electric mountain bike with 700Wh battery, Turbo Full Power 2.2 Motor (90Nm torque), and mixed wheel mullet setup.",
      brand: "Specialized",
      pricePerDay: 75.0,
      stockQuantity: 3,
      isAvailable: true,
      categoryId: SEED.category4Id,
      providerId: SEED.providerId,
      imageUrls: [
        "https://images.unsplash.com/photo-1571333250630-f0230c320b6d?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1511994298241-608e28f14fde?auto=format&fit=crop&w=800&q=80",
      ],
      specifications: {
        battery: "700Wh integrated Li-Ion with smart charger",
        motor: "Specialized 2.2 Custom Rx Trail Tuned (90Nm)",
        range: "Up to 5 hours / 40 miles trail riding",
        wheelSetup: "29\" front / 27.5\" rear Mullet",
      },
    },
    {
      id: "c0000000-0000-4000-a000-000000000113",
      name: "Giro Manifest Spherical MIPS Helmet & Pro Tool Kit",
      description:
        "Premium spherical MIPS technology trail helmet paired with a Topeak multi-tool, tubeless plug kit, and high-volume mini pump.",
      brand: "Giro",
      pricePerDay: 14.0,
      stockQuantity: 10,
      isAvailable: true,
      categoryId: SEED.category4Id,
      providerId: SEED.providerId,
      imageUrls: [
        "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1559348349-86f1f65817fe?auto=format&fit=crop&w=800&q=80",
      ],
      specifications: {
        protection: "Spherical MIPS Technology with dual EPS foam",
        ventilation: "19 Wind Tunnel vents with internal channeling",
        size: "Medium (55-59 cm)",
        kitItems: ["Topeak Ratchet Rocket Tool", "Dynaplug tire repair", "High-pressure pump"],
      },
    },

    // ----------------- Climbing -----------------
    {
      id: "c0000000-0000-4000-a000-000000000114",
      name: "Petzl Corax Complete Climbing Harness & Belay Kit",
      description:
        "Versatile and comfortable all-around climbing harness with doubleback buckles, Petzl Reverso belay device, and Attache locking carabiner.",
      brand: "Petzl",
      pricePerDay: 20.0,
      stockQuantity: 6,
      isAvailable: true,
      categoryId: SEED.category5Id,
      providerId: SEED.provider2Id,
      imageUrls: [
        "https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1564769662533-4f00a87b4056?auto=format&fit=crop&w=800&q=80",
      ],
      specifications: {
        certifications: "CE EN 12277 type C, UIAA",
        gearLoops: "4 rigid gear loops",
        included: ["Petzl Corax Harness (Size 1)", "Reverso Belay/Rappel Device", "Attache Carabiner", "Chalk Bag"],
      },
    },
    {
      id: "c0000000-0000-4000-a000-000000000115",
      name: "Mammut 9.8 Crag Classic 70m Dynamic Rope",
      description:
        "Standard single climbing rope for sport and traditional climbing with center mark and low impact force rating.",
      brand: "Mammut",
      pricePerDay: 24.0,
      stockQuantity: 5,
      isAvailable: true,
      categoryId: SEED.category5Id,
      providerId: SEED.provider2Id,
      imageUrls: [
        "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=800&q=80",
      ],
      specifications: {
        length: "70 Meters",
        diameter: "9.8 mm",
        ropeType: "Single Dynamic Rope",
        uIAAImpactForce: "8.8 kN",
        sheathProportion: "38%",
      },
    },
    {
      id: "c0000000-0000-4000-a000-000000000116",
      name: "Black Diamond Mondo Bouldering Crash Pad",
      description:
        "Large-format high-durability landing pad with closed-cell PE foam top and high-compression PU foam base for highball boulder problems.",
      brand: "Black Diamond",
      pricePerDay: 25.0,
      stockQuantity: 4,
      isAvailable: true,
      categoryId: SEED.category5Id,
      providerId: SEED.provider2Id,
      imageUrls: [
        "https://images.unsplash.com/photo-1583508915901-b5f84c1dcde1?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&w=800&q=80",
      ],
      specifications: {
        dimensionsOpen: "112 x 165 x 12.5 cm (44 x 65 x 5 in)",
        dimensionsClosed: "112 x 82 x 25 cm",
        weight: "9.25 kg (20 lbs 6 oz)",
        features: ["Padded shoulder straps", "Waistbelt", "Integrated shoe-cleaning carpet"],
      },
    },
    {
      id: "c0000000-0000-4000-a000-000000000117",
      name: "La Sportiva Solution Comp Performance Climbing Shoes",
      description:
        "High-performance downturned climbing shoe with Lock Harness system and Vibram XS Grip 2 rubber for micro-edges and toe hooks.",
      brand: "La Sportiva",
      pricePerDay: 15.0,
      stockQuantity: 8,
      isAvailable: true,
      categoryId: SEED.category5Id,
      providerId: SEED.provider2Id,
      imageUrls: [
        "https://images.unsplash.com/photo-1516592673884-4a382d1124c2?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80",
      ],
      specifications: {
        upper: "Leather / Lorica microfiber",
        sole: "3.5mm Vibram XS Grip 2",
        closure: "Fast Lacing System hook-and-loop",
        profile: "Aggressive downturn with P3 Power Platform",
      },
    },

    // ----------------- Fitness -----------------
    {
      id: "c0000000-0000-4000-a000-000000000118",
      name: "Bowflex SelectTech 552 Adjustable Dumbbells (Pair)",
      description:
        "Adjusts from 5 to 52.5 lbs in 2.5 lb increments with the turn of a dial. Replaces 15 sets of weights in one compact footprint.",
      brand: "Bowflex",
      pricePerDay: 22.0,
      stockQuantity: 6,
      isAvailable: true,
      categoryId: SEED.category6Id,
      providerId: SEED.provider3Id,
      imageUrls: [
        "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80",
      ],
      specifications: {
        weightRange: "5 to 52.5 lbs per dumbbell (2.3 to 24 kg)",
        weightSettings: "15 weight settings",
        dimensions: "15.75\" L x 8\" W x 9\" H",
        included: ["2x SelectTech Dumbbells", "2x Storage base trays"],
      },
    },
    {
      id: "c0000000-0000-4000-a000-000000000119",
      name: "Rogue Powder Coat Competition Kettlebell Set (16kg & 24kg)",
      description:
        "Single-piece cast iron competition grade kettlebells with color-coded handle bands and flat machined bases for Russian swings and snatches.",
      brand: "Rogue Fitness",
      pricePerDay: 18.0,
      stockQuantity: 5,
      isAvailable: true,
      categoryId: SEED.category6Id,
      providerId: SEED.provider3Id,
      imageUrls: [
        "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80",
      ],
      specifications: {
        weights: "1x 16 kg (35 lbs) + 1x 24 kg (53 lbs)",
        material: "First-run ductile iron casting",
        finish: "Textured matte black powder coat",
        handleDiameter: "33 mm (1.3 in)",
      },
    },
    {
      id: "c0000000-0000-4000-a000-000000000120",
      name: "Titan Fitness Portable Squat & Pull-Up Stand",
      description:
        "Heavy-duty 11-gauge 2x3\" steel power stand with multi-grip pull-up bar, J-hooks, and spotter arms for home and outdoor garage workouts.",
      brand: "Titan Fitness",
      pricePerDay: 30.0,
      stockQuantity: 3,
      isAvailable: true,
      categoryId: SEED.category6Id,
      providerId: SEED.provider3Id,
      imageUrls: [
        "https://images.unsplash.com/photo-1598289431512-b97b0917affc?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=800&q=80",
      ],
      specifications: {
        weightCapacity: "1,000 lbs",
        height: "84 inches",
        footprint: "48\" x 48\"",
        accessories: ["Pair of J-Hooks with UHMW plastic", "Pair of Safety Spotter Arms"],
      },
    },
    {
      id: "c0000000-0000-4000-a000-000000000121",
      name: "Manduka PRO Natural Rubber Yoga & Recovery Mat Kit",
      description:
        "High-density 6mm cushion yoga and recovery mat paired with cork blocks and stretching strap for mobility and post-hike recovery.",
      brand: "Manduka",
      pricePerDay: 10.0,
      stockQuantity: 12,
      isAvailable: true,
      categoryId: SEED.category6Id,
      providerId: SEED.provider3Id,
      imageUrls: [
        "https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80",
      ],
      specifications: {
        dimensions: "71\" x 26\" x 6 mm",
        material: "Closed-cell PVC (OEKO-TEX certified)",
        kitItems: ["Manduka PRO 6mm Mat", "2x Recycled Cork Blocks", "8ft UnfoLD Yoga Strap"],
      },
    },
  ];

  for (const item of gearItems) {
    await prisma.gearItem.create({ data: item });
  }
  console.log(`Created ${gearItems.length} gear listings with multi-image Unsplash galleries.`);

  // 5. Rental Orders & Rental Items across various lifecycle states
  // Order 1: PENDING (Customer 1, Mountain Bike Pro)
  const order1 = await prisma.rentalOrder.create({
    data: {
      id: SEED.rental1Id,
      customerId: SEED.customerId,
      startDate: new Date("2026-08-25T00:00:00Z"),
      endDate: new Date("2026-08-28T00:00:00Z"),
      totalAmount: 147.0, // 49 * 3 days
      status: "PENDING",
      rentalItems: {
        create: [
          {
            id: "c0000000-0000-4000-a000-000000000201",
            gearItemId: SEED.gear1Id,
            quantity: 1,
            pricePerDay: 49.0,
          },
        ],
      },
    },
  });

  // Order 2: CONFIRMED (Customer 2, Coleman Tent + Camping Stove)
  const order2 = await prisma.rentalOrder.create({
    data: {
      id: SEED.rental2Id,
      customerId: SEED.customer2Id,
      startDate: new Date("2026-08-22T00:00:00Z"),
      endDate: new Date("2026-08-25T00:00:00Z"),
      totalAmount: 126.0, // (28 + 14) * 3 days
      status: "CONFIRMED",
      rentalItems: {
        create: [
          {
            id: "c0000000-0000-4000-a000-000000000202",
            gearItemId: SEED.gear2Id,
            quantity: 1,
            pricePerDay: 28.0,
          },
          {
            id: "c0000000-0000-4000-a000-000000000203",
            gearItemId: "c0000000-0000-4000-a000-000000000102",
            quantity: 1,
            pricePerDay: 14.0,
          },
        ],
      },
    },
  });

  // Order 3: PICKED_UP (Customer 1, Tandem Kayak + Life Jacket)
  const order3 = await prisma.rentalOrder.create({
    data: {
      id: SEED.rental3Id,
      customerId: SEED.customerId,
      startDate: new Date("2026-08-16T00:00:00Z"),
      endDate: new Date("2026-08-19T00:00:00Z"),
      totalAmount: 171.0, // (45 + 12) * 3 days
      status: "PICKED_UP",
      rentalItems: {
        create: [
          {
            id: "c0000000-0000-4000-a000-000000000204",
            gearItemId: SEED.gear3Id,
            quantity: 1,
            pricePerDay: 45.0,
          },
          {
            id: "c0000000-0000-4000-a000-000000000205",
            gearItemId: "c0000000-0000-4000-a000-000000000106",
            quantity: 1,
            pricePerDay: 12.0,
          },
        ],
      },
    },
  });

  // Order 4: RETURNED (Customer 3, Salomon Skis + Burton Snowboard)
  const order4 = await prisma.rentalOrder.create({
    data: {
      id: SEED.rental4Id,
      customerId: SEED.customer3Id,
      startDate: new Date("2026-08-01T00:00:00Z"),
      endDate: new Date("2026-08-04T00:00:00Z"),
      totalAmount: 309.0, // (55 + 48) * 3 days
      status: "RETURNED",
      rentalItems: {
        create: [
          {
            id: "c0000000-0000-4000-a000-000000000206",
            gearItemId: "c0000000-0000-4000-a000-000000000107",
            quantity: 1,
            pricePerDay: 55.0,
          },
          {
            id: "c0000000-0000-4000-a000-000000000207",
            gearItemId: "c0000000-0000-4000-a000-000000000108",
            quantity: 1,
            pricePerDay: 48.0,
          },
        ],
      },
    },
  });

  // Order 5: RETURNED (Customer 4, Petzl Harness + Mammut Rope)
  const order5 = await prisma.rentalOrder.create({
    data: {
      id: SEED.rental5Id,
      customerId: SEED.customer4Id,
      startDate: new Date("2026-08-05T00:00:00Z"),
      endDate: new Date("2026-08-07T00:00:00Z"),
      totalAmount: 88.0, // (20 + 24) * 2 days
      status: "RETURNED",
      rentalItems: {
        create: [
          {
            id: "c0000000-0000-4000-a000-000000000208",
            gearItemId: "c0000000-0000-4000-a000-000000000114",
            quantity: 1,
            pricePerDay: 20.0,
          },
          {
            id: "c0000000-0000-4000-a000-000000000209",
            gearItemId: "c0000000-0000-4000-a000-000000000115",
            quantity: 1,
            pricePerDay: 24.0,
          },
        ],
      },
    },
  });

  console.log(`Created 5 rental orders across PENDING, CONFIRMED, PICKED_UP, and RETURNED statuses.`);

  // 6. Payments
  const payments = [
    {
      id: SEED.payment1Id,
      rentalId: SEED.rental1Id,
      amount: 147.0,
      method: "STRIPE" as const,
      status: "PENDING" as const,
      transactionId: "txn_stripe_pending_01",
      provider: "STRIPE",
    },
    {
      id: SEED.payment2Id,
      rentalId: SEED.rental2Id,
      amount: 126.0,
      method: "STRIPE" as const,
      status: "PENDING" as const,
      transactionId: "txn_stripe_pending_02",
      provider: "STRIPE",
    },
    {
      id: SEED.payment3Id,
      rentalId: SEED.rental3Id,
      amount: 171.0,
      method: "STRIPE" as const,
      status: "COMPLETED" as const,
      transactionId: "txn_stripe_success_03",
      provider: "STRIPE",
      paidAt: new Date("2026-08-15T14:30:00Z"),
    },
    {
      id: SEED.payment4Id,
      rentalId: SEED.rental4Id,
      amount: 309.0,
      method: "SSLCOMMERZ" as const,
      status: "COMPLETED" as const,
      transactionId: "SSL_TXN_99812458",
      provider: "SSLCOMMERZ",
      paidAt: new Date("2026-07-31T09:15:00Z"),
    },
  ];

  for (const p of payments) {
    await prisma.payment.create({ data: p });
  }
  console.log(`Created ${payments.length} payment records.`);

  // 7. Verified Reviews on Completed / Returned Rentals
  const reviews = [
    {
      id: SEED.review1Id,
      customerId: SEED.customerId,
      gearItemId: SEED.gear1Id,
      rentalId: SEED.rental1Id,
      rating: 5,
      comment:
        "Phenomenal mountain bike! The Fox suspension soaked up every drop on the trails, and the shifting was butter-smooth. Highly recommend renting from Jane!",
    },
    {
      id: SEED.review2Id,
      customerId: SEED.customer2Id,
      gearItemId: SEED.gear2Id,
      rating: 5,
      comment:
        "Super easy setup in under 8 minutes. We had heavy overnight rain and the interior stayed 100% bone dry. Plenty of headspace for 4 people.",
    },
    {
      id: SEED.review3Id,
      customerId: SEED.customer3Id,
      gearItemId: SEED.gear3Id,
      rating: 5,
      comment:
        "Took the tandem kayak out on the bay for 3 days. Extremely stable in choppy water, and the seats provided great lumbar support.",
    },
    {
      id: SEED.review4Id,
      customerId: SEED.customer3Id,
      gearItemId: "c0000000-0000-4000-a000-000000000107",
      rating: 5,
      comment:
        "The Salomon QST 98s are absolute rockets! Carved on hardpack and handled the deep afternoon powder effortlessly.",
    },
    {
      id: SEED.review5Id,
      customerId: SEED.customer4Id,
      gearItemId: "c0000000-0000-4000-a000-000000000114",
      rating: 5,
      comment:
        "The Petzl Corax harness is super comfortable for all-day hanging belays. Clean gear loops and smooth Reverso action.",
    },
    {
      id: SEED.review6Id,
      customerId: SEED.customer4Id,
      gearItemId: "c0000000-0000-4000-a000-000000000115",
      rating: 4,
      comment:
        "Great supple handling and easy to clip. Center mark made rappels fast and safe. Would definitely rent again!",
    },
  ];

  for (const r of reviews) {
    await prisma.review.create({ data: r });
  }
  console.log(`Created ${reviews.length} authentic customer reviews with 4 & 5-star ratings.`);

  // 8. Generate JWT tokens for test automation and Postman/Bruno environment sync
  const customerToken = generateToken(
    SEED.customerId,
    "customer@gearup.test",
    "CUSTOMER",
  );
  const providerToken = generateToken(
    SEED.providerId,
    "provider@gearup.test",
    "PROVIDER",
  );
  const adminToken = generateToken(SEED.adminId, "admin@gearup.test", "ADMIN");

  console.log("\n=================== SEED DATA SUMMARY ===================");
  console.log(`Customer:     customer@gearup.test / password123`);
  console.log(`Provider:     provider@gearup.test / password123`);
  console.log(`Admin:        admin@gearup.test    / password123`);
  console.log(`Categories:   ${categories.length} activity categories`);
  console.log(`Gear Items:   ${gearItems.length} outdoor gear listings`);
  console.log(`Orders:       5 rental orders (Pending, Confirmed, Picked Up, Returned)`);
  console.log(`Reviews:      ${reviews.length} customer reviews`);
  console.log("=========================================================\n");

  // 9. Auto-update environment file
  const envPath = path.join(
    process.cwd(),
    "api_collections/GearUp/environments/default.yml",
  );
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
  try {
    fs.writeFileSync(envPath, envContent);
    console.log(`Updated environment file at api_collections/GearUp/environments/default.yml`);
  } catch (err) {
    console.log(`Note: environment file skipped or not found at ${envPath}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
