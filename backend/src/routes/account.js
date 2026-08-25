import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prismaClient.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// ---- Profile ----

router.get("/me", async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  res.json({ id: user.id, phone: user.phone, name: user.name, email: user.email, role: user.role });
});

router.put("/me", async (req, res) => {
  const schema = z.object({ name: z.string().min(1).optional(), email: z.string().email().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

  const user = await prisma.user.update({ where: { id: req.user.id }, data: parsed.data });
  res.json({ id: user.id, phone: user.phone, name: user.name, email: user.email });
});

// ---- Addresses ----

const addressSchema = z.object({
  label: z.string().min(1),
  line1: z.string().min(1),
  line2: z.string().optional(),
  landmark: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  pincode: z.string().min(4),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  isDefault: z.boolean().optional(),
});

router.get("/addresses", async (req, res) => {
  const addresses = await prisma.address.findMany({
    where: { userId: req.user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
  res.json(addresses);
});

router.post("/addresses", async (req, res) => {
  const parsed = addressSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

  if (parsed.data.isDefault) {
    await prisma.address.updateMany({ where: { userId: req.user.id }, data: { isDefault: false } });
  }
  const address = await prisma.address.create({ data: { ...parsed.data, userId: req.user.id } });
  res.status(201).json(address);
});

router.put("/addresses/:id", async (req, res) => {
  const parsed = addressSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

  const existing = await prisma.address.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!existing) return res.status(404).json({ error: "Address not found" });

  if (parsed.data.isDefault) {
    await prisma.address.updateMany({ where: { userId: req.user.id }, data: { isDefault: false } });
  }
  const address = await prisma.address.update({ where: { id: req.params.id }, data: parsed.data });
  res.json(address);
});

router.delete("/addresses/:id", async (req, res) => {
  const existing = await prisma.address.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!existing) return res.status(404).json({ error: "Address not found" });
  await prisma.address.delete({ where: { id: req.params.id } });
  res.json({ message: "Address deleted" });
});

export default router;
