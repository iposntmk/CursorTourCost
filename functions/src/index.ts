import express from "express";
import cors from "cors";
import {onRequest} from "firebase-functions/v2/https";
import {setGlobalOptions} from "firebase-functions/v2/options";

setGlobalOptions({region: "asia-southeast1"});

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://your-frontend-domain.com", // đổi sang domain production thật của bạn
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "OPTIONS"],
  credentials: true,
};

app.use(express.json({limit: "15mb"}));
app.use(express.urlencoded({extended: true, limit: "15mb"}));

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.get("/", (_req, res) => {
  res.json({ok: true, service: "ai-config-api"});
});

app.get("/prompt/latest", (_req, res) => {
  res.json({
    id: "latest",
    version: "init",
    content: "Hello from Cloud Functions 🚀",
  });
});

app.get("/schemas/active", (_req, res) => {
  res.json({
    name: "TourExtractSchema",
    fields: ["tourCode", "guideName", "startDate", "endDate"],
  });
});

app.post("/ai/extract", (req, res) => {
  const {
    imageUrl,
    imageBase64,
    overrides,
    imageName,
    imageMimeType,
  } = req.body ?? {};

  res.json({
    raw_output: {
      imageUrl: imageUrl ?? null,
      imageName: imageName ?? null,
      imageMimeType: imageMimeType ?? null,
      imageBytesLength:
        typeof imageBase64 === "string" ? imageBase64.length : 0,
      overrides: overrides ?? null,
    },
    parsed: {
      ok: true,
      received: imageUrl ? "url" : "upload",
    },
  });
});

export const api = onRequest(app);
