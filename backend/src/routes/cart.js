import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prismaClient.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// ---- Cart ----

router.get("/cart", async (req, res) => {
  const items = await prisma.cartItem.findMany({
    where: { userId: req.user.id },
    include: { product: true },
    orderBy: { createdAt: "asc" },
  });
  const subtotal = items.reduce((sum, i) => sum + Number(i.product.sellingPrice) * i.quantity, 0);
  res.json({ items, subtotal });
});

router.post("/cart", async (req, res) => {
  const schema = z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).default(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

  const { productId, quantity } = parsed.data;
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || !product.isActive) return res.status(404).json({ error: "Product not found" });
  if (product.stockQty < quantity) return res.status(400).json({ error: "Not enough stock available" });

  const item = await prisma.cartItem.upsert({
    where: { userId_productId: { userId: req.user.id, productId } },
    update: { quantity: { increment: quantity } },
    create: { userId: req.user.id, productId, quantity },
  });
  res.status(201).json(item);
});

router.put("/cart/:productId", async (req, res) => {
  const schema = z.object({ quantity: z.number().int().min(0) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

  const { quantity } = parsed.data;
  const { productId } = req.params;

  if (quantity === 0) {
    await prisma.cartItem.deleteMany({ where: { userId: req.user.id, productId } });
    return res.json({ message: "Removed from cart" });
  }

  const item = await prisma.cartItem.update({
    where: { userId_productId: { userId: req.user.id, productId } },
    data: { quantity },
  });
  res.json(item);
});

router.delete("/cart/:productId", async (req, res) => {
  await prisma.cartItem.deleteMany({ where: { userId: req.user.id, productId: req.params.productId } });
  res.json({ message: "Removed from cart" });
});

// ---- Wishlist ----

router.get("/wishlist", async (req, res) => {
  const items = await prisma.wishlistItem.findMany({
    where: { userId: req.user.id },
    include: { product: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(items);
});

router.post("/wishlist", async (req, res) => {
  const schema = z.object({ productId: z.string().uuid() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

  const item = await prisma.wishlistItem.upsert({
    where: { userId_productId: { userId: req.user.id, productId: parsed.data.productId } },
    update: {},
    create: { userId: req.user.id, productId: parsed.data.productId },
  });
  res.status(201).json(item);
});

router.delete("/wishlist/:productId", async (req, res) => {
  await prisma.wishlistItem.deleteMany({ where: { userId: req.user.id, productId: req.params.productId } });
  res.json({ message: "Removed from wishlist" });
});

export default router;
