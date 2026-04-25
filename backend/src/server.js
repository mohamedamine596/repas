import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import helmet from "helmet";

import authRoutes from "./routes/auth.js";
import messageRoutes from "./routes/messages.js";
import mealRoutes from "./routes/meals.js";
import reportRoutes from "./routes/reports.js";
import verificationRoutes from "./routes/verification.js";
import adminRoutes from "./routes/admin.js";
import { connectDb } from "./config/mongoose.js";

const app = express();
const port = Number(process.env.PORT || 4000);
const configuredTrustProxy = String(process.env.TRUST_PROXY || "").trim();
const configuredOrigins = String(process.env.CORS_ORIGIN || "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);
const vercelFrontendOrigin = "https://repas-sable.vercel.app";
const defaultAllowedOrigins = process.env.NODE_ENV === "production"
  ? [vercelFrontendOrigin, "https://*.vercel.app"]
  : ["http://localhost:8080", "http://localhost:8081", "http://localhost:5173", vercelFrontendOrigin, "https://*.vercel.app"];
const allAllowedOrigins = [...configuredOrigins, ...defaultAllowedOrigins];
const exactAllowedOrigins = new Set(
  allAllowedOrigins.filter((item) => !item.includes("*"))
);
const wildcardAllowedOrigins = allAllowedOrigins
  .filter((item) => item.includes("*"))
  .map((pattern) =>
    new RegExp(
      `^${pattern
        .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, ".*")}$`
    )
  );

function isAllowedOrigin(origin) {
  if (exactAllowedOrigins.has(origin)) {
    return true;
  }

  return wildcardAllowedOrigins.some((matcher) => matcher.test(origin));
}

if (configuredTrustProxy) {
  const normalized = configuredTrustProxy.toLowerCase();
  if (normalized === "true") {
    app.set("trust proxy", 1);
  } else if (normalized === "false") {
    app.set("trust proxy", false);
  } else if (!Number.isNaN(Number(normalized))) {
    app.set("trust proxy", Number(normalized));
  } else {
    app.set("trust proxy", configuredTrustProxy);
  }
} else if (process.env.NODE_ENV === "production") {
  // Render and similar platforms forward requests through a proxy.
  app.set("trust proxy", 1);
}

app.use(cors({
  origin(origin, callback) {
    if (!origin || isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));
app.use(helmet({
  crossOriginResourcePolicy: false,
}));
app.use(cookieParser());
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "coeur-table-partage-backend",
    message: "Use /api/health, /api/auth, and /api/messages"
  });
});

app.get("/.well-known/appspecific/com.chrome.devtools.json", (req, res) => {
  res.status(204).end();
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "coeur-table-partage-backend" });
});

app.use("/api/auth", authRoutes);
app.use("/api/verification", verificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/meals", mealRoutes);
app.use("/api/reports", reportRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

await connectDb();

app.listen(port, () => {
  console.log(`Backend API listening on http://localhost:${port}`);
});
