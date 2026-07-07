import cors from "cors";
import express from "express";
import config from "./config";

const app = express();

app.use(cors({
  origin: config.cors_origin,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (_req, res) => {
	res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default app;
