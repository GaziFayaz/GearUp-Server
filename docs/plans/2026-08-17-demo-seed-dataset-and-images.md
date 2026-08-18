---
title: "GearUp Demo Seed Dataset & Real Preview Images"
date: "2026-08-17"
artifact_contract: "ce-unified-plan/v1"
artifact_readiness: "requirements-only"
product_contract_source: "ce-brainstorm"
execution: "code"
---

# GearUp Demo Seed Dataset & Real Preview Images

## Goal Capsule

- **Objective:** Provide a production-grade demonstration dataset for the GearUp platform featuring 6 sports/outdoor categories, 20+ realistic gear items with rich multi-image Unsplash galleries, multiple user roles (Customer, Provider, Admin), diverse rental order lifecycles (Pending, Confirmed, Picked Up, Returned, Cancelled), matching payments, and authentic customer reviews.
- **Product Authority:** GearUp full-stack demo and testing ecosystem across `gearup-server` and `gearup-client`.
- **Open Blockers:** None.
- **Surrounding Scope:** Database schema changes, third-party file upload services (e.g. AWS S3/Cloudinary), and client UI restructuring are out of active scope for this data seeding milestone.

---

## Product Contract

### Summary
Transform the existing minimal 3-item database seed into a comprehensive, visually rich showcase dataset. The new seed populates 6 distinct equipment categories matching the frontend client, 20+ high-demand sports & outdoor rental items equipped with high-resolution Unsplash imagery and realistic technical specs, multiple provider & customer accounts, and rental orders spanning every business lifecycle state with payments and reviews.

### Problem Frame
The current database seed contains only 2 categories and 3 gear items with placeholder image URLs (`example.com/bike1.jpg`), 1 single customer order, and 1 review. When presenting the application, the public catalog looks empty, category exploration fails for 4 out of 6 categories, gear detail galleries lack authentic visuals, and provider/customer/admin dashboards have insufficient lifecycle states to demonstrate order transitions, payment statuses, and review submissions.

### Primary Actors
- **A1. Public Visitor / Prospective Customer:** Browses the homepage, category pages, and search/filter catalog expecting authentic gear photos, transparent daily pricing, and customer ratings.
- **A2. Active Customer (`customer@gearup.test` & additional seeded customers):** Views order history with various statuses (`CONFIRMED`, `PICKED_UP`, `RETURNED`), initiates payment, and submits reviews.
- **A3. Gear Provider (`provider@gearup.test` & additional gear shops):** Manages inventory across multiple categories, inspects incoming rental requests, and updates order fulfillment states.
- **A4. Admin (`admin@gearup.test`):** Observes platform-wide metrics, moderates user listings, and monitors transaction volume.

---

### Key Requirements

#### Categories & Catalog Structure
- R1. Seed all 6 activity categories matching the client UI:
  - 1. **Camping & Hiking** (Tents, sleeping bags, backpacks, camping stoves)
  - 2. **Water Sports** (Kayaks, stand-up paddleboards, wetsuits, life jackets)
  - 3. **Winter Sports** (All-mountain skis, snowboards, goggles, winter boots)
  - 4. **Cycling & Bikes** (Mountain bikes, road bikes, gravel bikes, e-bikes)
  - 5. **Climbing** (Harnesses, climbing ropes, crash pads, climbing shoes)
  - 6. **Fitness** (Adjustable dumbbells, kettlebell sets, portable power racks)
- R2. Each category must include an evocative description and a dedicated high-resolution category hero image URL from Unsplash.

#### Gear Items & Visuals
- R3. Seed at least 20–24 distinct, high-quality gear items distributed across all 6 categories (minimum 3–4 items per category).
- R4. Each gear item must feature:
  - Realistic product name and detailed description highlighting features, intended skill level, and condition.
  - Authentic, recognizable brands (e.g., The North Face, Trek, Specialized, Burton, Black Diamond, Ocean Kayak, Rogue, Petzl, Coleman, Salomon).
  - Realistic market rental pricing per day ($15.00 – $95.00 / day).
  - Stock quantity (2 to 10 units) and availability flags.
  - Multi-image array (`imageUrls`) containing 2–3 high-resolution Unsplash sports/outdoor photo URLs with optimized CDN parameters (`auto=format&fit=crop&w=800&q=80`) for responsive loading in Next.js Image components.
  - Structured JSON `specifications` (e.g., capacity, weight, dimensions, materials, included accessories).

#### User Accounts & Roles
- R5. Preserve deterministic primary accounts:
  - Customer: `customer@gearup.test` / `password123`
  - Provider: `provider@gearup.test` / `password123`
  - Admin: `admin@gearup.test` / `password123`
- R6. Add realistic secondary customer and provider profiles (e.g. "Summit Adventure Gear", "Alpine Trail Rentals", "Sarah Chen", "Marcus Vance") with Unsplash avatar profile images to demonstrate multi-vendor and multi-customer interactions.

#### Rental Orders, Payments & Reviews Lifecycle
- R7. Seed rental orders demonstrating every status in `RentalStatus`:
  - `PENDING` (Waiting for provider confirmation)
  - `CONFIRMED` (Confirmed by provider, awaiting customer payment)
  - `PICKED_UP` (Paid and currently with customer)
  - `RETURNED` (Rental completed, eligible for customer review)
  - `CANCELLED` (Cancelled order example)
- R8. Seed corresponding `Payment` records for confirmed/picked up/returned rentals with `STRIPE` and `SSLCOMMERZ` methods, transaction IDs, and realistic timestamps.
- R9. Seed authentic `Review` records (ratings 4–5 with constructive outdoor experience commentary) on completed rentals to populate average rating calculations and review lists.

#### Environment & Developer Ergonomics
- R10. Maintain backward compatibility with `api_collections/GearUp/environments/default.yml` and Postman collections by retaining static deterministic UUIDs for standard anchor records (`customerId`, `providerId`, `adminId`, `gear1Id`, etc.).
- R11. Provide a single-command seed execution (`npm run prisma:seed` in `gearup-server`) that is idempotent and cleanly resets and populates all tables.

---

### Key Flows

- F1. **Public Catalog & Category Exploration**
  - **Trigger:** Visitor lands on home page or `/categories`.
  - **Actors:** A1 (Public Visitor)
  - **Steps:** Visitor sees 6 populated category cards with crisp photos; clicking any category displays 3+ rich gear items with multiple thumbnails, accurate daily rates, and star ratings.
  - **Covered by:** R1, R2, R3, R4, R9

- F2. **Customer Rental Management & Reviewing**
  - **Trigger:** Customer logs into `/dashboard/customer`.
  - **Actors:** A2 (Customer)
  - **Steps:** Customer sees past and active rentals in various states: an active rental (`PICKED_UP`), a ready-to-pay order (`CONFIRMED`), and a completed order (`RETURNED`) displaying existing review and rating.
  - **Covered by:** R5, R7, R8, R9

- F3. **Provider Order Fulfillment & Inventory Dashboard**
  - **Trigger:** Provider logs into `/dashboard/provider`.
  - **Actors:** A3 (Provider)
  - **Steps:** Provider sees diverse inventory items across categories, total revenue metrics, and incoming orders requiring confirmation or pickup marking.
  - **Covered by:** R5, R6, R7, R8

---

### Scope Boundaries

- **In Scope:**
  - Complete overhaul of `gearup-server/prisma/seeds/seed.ts`.
  - Curated high-resolution Unsplash photo links for 6 categories and 20+ gear listings (2–3 photos per item).
  - Seed data for users (Customer, Provider, Admin), categories, gear items, rental orders, rental items, payments, and reviews.
  - Synchronizing generated IDs and auth tokens to API environment files (`api_collections/GearUp/environments/default.yml`).

- **Out of Scope:**
  - Prisma schema modifications (existing schema already supports all required fields).
  - Third-party cloud storage integration (direct CDN URLs are used).
  - Next.js client code refactoring (client is already built to consume this data format).

---

### Acceptance Examples

- AE1. **Category Grid Verification:** Navigating to `/categories` on the client shows all 6 categories with custom icons, non-empty descriptions, and active gear items under each. (Covers R1, R2)
- AE2. **Gear Details & Gallery:** Clicking into any gear item (e.g. Mountain Bike, 4-Person Tent, Kayak, Snowboard) renders 2–3 valid, high-resolution preview images that load cleanly without 404 or broken image placeholders. (Covers R3, R4)
- AE3. **Provider Order List Diversity:** Querying `GET /api/provider/orders` or viewing the provider dashboard displays orders in `PENDING`, `CONFIRMED`, `PICKED_UP`, and `RETURNED` states. (Covers R7)
- AE4. **Review & Ratings Display:** Gear items with completed rentals display average rating scores (e.g. 4.8 / 5.0) and written reviews from customers. (Covers R9)
- AE5. **Deterministic API Compatibility:** Running the Bruno / Postman test collection with `default.yml` passes authentication and lookup tests against seeded anchor IDs. (Covers R10, R11)

---

### Outstanding Questions

- Q1. **Image Host Domains in Next.js:** Next.js `next.config.ts` currently allows wildcard hostnames (`**`). If strict remote domain filtering is enforced in the future, `images.unsplash.com` will need to be explicitly whitelisted. *(Classification: Deferred to Planning)*
