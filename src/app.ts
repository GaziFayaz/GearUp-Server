import cors from "cors";
import express from "express";
import config from "./config/index.js";
import cookieParser from "cookie-parser";
import { globalErrorHandler } from "./middleware/globalErrorHandler.js";
import authRoutes from "./modules/auth/auth.routes.js";
import gearRoutes, {
  providerRouter as providerGearRoutes,
} from "./modules/gear/gear.routes.js";
import categoryRoutes from "./modules/category/category.routes.js";
import rentalRoutes, {
  providerRouter as providerRentalRoutes,
} from "./modules/rental/rental.routes.js";
import paymentRoutes from "./modules/payment/payment.routes.js";
import reviewRoutes from "./modules/review/review.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";

const app = express();

const allowedOrigins = config.cors_origin
  ? config.cors_origin.split(",").map((o) => o.trim())
  : true;

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/gear", gearRoutes);
app.use("/api/provider/gear", providerGearRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/rentals", rentalRoutes);
app.use("/api/provider/orders", providerRentalRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/admin", adminRoutes);

app.use(globalErrorHandler);

export default app;
