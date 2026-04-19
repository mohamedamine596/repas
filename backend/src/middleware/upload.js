import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";
import { nanoid } from "nanoid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, "../../uploads/verifications");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const MIME_EXTENSIONS = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

function sanitizeBaseName(filename) {
  return path
    .basename(filename)
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 80);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const extension = MIME_EXTENSIONS[file.mimetype] || path.extname(file.originalname).toLowerCase();
    const safeBase = sanitizeBaseName(file.originalname).replace(/\.[^.]+$/, "");
    cb(null, `${Date.now()}-${nanoid()}-${safeBase}${extension}`);
  },
});

function fileFilter(_req, file, cb) {
  if (!MIME_EXTENSIONS[file.mimetype]) {
    cb(new Error("Only PDF, JPG, PNG, and WEBP files are allowed"));
    return;
  }
  cb(null, true);
}

export const verificationUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
});
