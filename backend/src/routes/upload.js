import { Router } from "express";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return cb(new Error("Only JPEG, PNG, or WEBP images are allowed"));
    }
    cb(null, true);
  },
});

// Admin-only: upload a product/category image. Returns a URL usable directly
// as `imageUrl` when creating/editing products or categories.
//
// This stores files on local disk, served at /uploads/<filename> — fine to start with,
// but on most hosting platforms local disk is ephemeral (wiped on redeploy). For real
// production use, swap this handler to upload to Cloudinary/S3 instead: the route
// signature and response shape (`{ url }`) can stay identical, so no frontend changes
// are needed — only this file changes.
router.post("/upload", requireAuth, requireAdmin, upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image file provided" });
  const url = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
  res.status(201).json({ url });
});

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message?.includes("images are allowed")) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

export default router;
