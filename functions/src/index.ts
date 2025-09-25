import express from "express";
import cors from "cors";
import { onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2/options";

setGlobalOptions({ region: "asia-southeast1" });

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://your-frontend-domain.com" // đổi sang domain production thật của bạn
];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
  })
);

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "ai-config-api" });
});

app.get("/prompt/latest", (_req, res) => {
  res.json({
    id: "latest",
    version: "init",
    content: "Hello from Cloud Functions 🚀"
  });
});

app.get("/schemas/active", (_req, res) => {
  res.json({
    name: "TourExtractSchema",
    fields: ["tourCode", "guideName", "startDate", "endDate"]
  });
});

export const api = onRequest(app);
