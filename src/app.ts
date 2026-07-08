import cors from "cors";
import express from "express";
import config from "./config";
import cookieParser from "cookie-parser";
import { globalErrorHandler } from "./middleware/globalErrorHandler";
import authRoutes from "./modules/auth/auth.routes";

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

app.use(globalErrorHandler);

export default app;
