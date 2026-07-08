import cors from "cors";
import express from "express";
import config from "./config";
import cookieParser from "cookie-parser";
import { globalErrorHandler } from "./middleware/globalErrorHandler";
import authRoutes from "./modules/auth/auth.routes";
import gearRoutes, { providerRouter as providerGearRoutes } from "./modules/gear/gear.routes";
import categoryRoutes from "./modules/category/category.routes";
import rentalRoutes, { providerRouter as providerRentalRoutes } from "./modules/rental/rental.routes";
import paymentRoutes from "./modules/payment/payment.routes";

const app = express();

app.use(cors({
  origin: config.cors_origin,
}));

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

app.use(globalErrorHandler);

export default app;
