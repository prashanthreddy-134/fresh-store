import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../prismaClient.js";
import { requestOtp, verifyOtp } from "../services/otpService.js";
import { signToken } from "../middleware/auth.js";

const router = Router();

// Prevent OTP-bombing a phone number
const otpRequestLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 5, standardHeaders: true });
// Prevent brute-forcing the 6-digit code itself (separate from the per-OTP attempt
// counter in otpService, which only tracks attempts against one specific code)
const otpVerifyLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 10, standardHeaders: true });

const phoneSchema = z.object({ phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, "Invalid phone number") });
const verifySchema = phoneSchema.extend({ code: z.string().length(6) });


// Development-only login. Never enabled in production.
router.post("/dev-login", async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ error: "Not found" });
  }

  const parsed = phoneSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }

  const { phone } = parsed.data;

  let user = await prisma.user.findUnique({ where: { phone } });

  if (!user) {
    user = await prisma.user.create({
      data: { phone, role: "CUSTOMER" },
    });
  }

  if (!user.isActive) {
    return res.status(403).json({ error: "Account disabled. Contact support." });
  }

  const token = signToken(user);

  res.json({
    token,
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
    },
  });
});


// ---- Customer registration ----
// Public route — a new customer does not have a JWT yet.
router.post("/register", async (req, res) => {
  const schema = z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters"),
    phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, "Invalid phone number"),
  });

  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: parsed.error.errors[0].message,
    });
  }

  const { name, phone } = parsed.data;

  try {
    let user = await prisma.user.findUnique({
      where: { phone },
    });

    if (user) {
      // Do not allow an existing admin/staff account
      // to be converted into a customer account.
      if (user.role !== "CUSTOMER") {
        return res.status(403).json({
          error: "This phone number is already registered for an admin account.",
        });
      }

      // Existing customer — update their name instead of creating
      // a duplicate user.
      user = await prisma.user.update({
        where: { id: user.id },
        data: { name },
      });
    } else {
      user = await prisma.user.create({
        data: {
          name,
          phone,
          role: "CUSTOMER",
        },
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        error: "Account disabled. Contact support.",
      });
    }

    // Registration immediately logs the customer in.
    const token = signToken(user);

    return res.status(201).json({
      message: "Account created successfully",
      token,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Registration error:", err);
    return res.status(500).json({
      error: "Could not create account",
    });
  }
});

// ---- Customer auth ----

router.post("/otp/request", otpRequestLimiter, async (req, res) => {
  const parsed = phoneSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

  const { phone } = parsed.data;
  const { expiresAt } = await requestOtp(phone, "LOGIN");
  res.json({ message: "OTP sent", expiresAt });
});

router.post("/otp/verify", otpVerifyLimiter, async (req, res) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

  const { phone, code } = parsed.data;
  const result = await verifyOtp(phone, code, "LOGIN");
  if (!result.valid) return res.status(400).json({ error: result.reason });

  let user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    user = await prisma.user.create({ data: { phone, role: "CUSTOMER" } });
  }
  if (!user.isActive) return res.status(403).json({ error: "Account disabled. Contact support." });

  const token = signToken(user);
  res.json({ token, user: { id: user.id, phone: user.phone, name: user.name, role: user.role } });
});

// ---- Admin auth ----
// Admin accounts must already exist in the DB with role ADMIN/STAFF (created via seed script
// or by a super-admin) — OTP alone cannot grant admin access to an unknown phone number.

router.post("/admin/otp/request", otpRequestLimiter, async (req, res) => {
  const parsed = phoneSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

  const { phone } = parsed.data;
  const admin = await prisma.user.findFirst({
    where: { phone, role: { in: ["ADMIN", "STAFF"] } },
  });
  if (!admin) return res.status(403).json({ error: "This number is not registered as an admin." });

  const { expiresAt } = await requestOtp(phone, "ADMIN_LOGIN");
  res.json({ message: "OTP sent", expiresAt });
});

router.post("/admin/otp/verify", otpVerifyLimiter, async (req, res) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

  const { phone, code } = parsed.data;
  const result = await verifyOtp(phone, code, "ADMIN_LOGIN");
  if (!result.valid) return res.status(400).json({ error: result.reason });

  const admin = await prisma.user.findFirst({
    where: { phone, role: { in: ["ADMIN", "STAFF"] } },
  });
  if (!admin || !admin.isActive) return res.status(403).json({ error: "Admin account not found or disabled." });

  const token = signToken(admin, process.env.ADMIN_JWT_EXPIRES_IN || "12h");
  res.json({ token, user: { id: admin.id, phone: admin.phone, name: admin.name, role: admin.role } });
});

export default router;
