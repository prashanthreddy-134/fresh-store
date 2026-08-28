import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prismaClient.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

// ============================================================
// CART
// ============================================================

// Get current user's cart
router.get("/cart", async (req, res) => {
  try {
    const items = await prisma.cartItem.findMany({
      where: { userId: req.user.id },
      include: { product: true },
      orderBy: { createdAt: "asc" },
    });

    const subtotal = items.reduce(
      (sum, item) =>
        sum +
        Number(item.product.sellingPrice) *
          item.quantity,
      0
    );

    res.json({
      items,
      subtotal,
    });
  } catch (err) {
    console.error("Get cart failed:", err);

    res.status(500).json({
      error: "Could not load cart",
    });
  }
});

// Add product to cart
router.post("/cart", async (req, res) => {
  try {
    const schema = z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().min(1).default(1),
    });

    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.errors[0].message,
      });
    }

    const { productId, quantity } = parsed.data;

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.isActive) {
      return res.status(404).json({
        error: "Product not found",
      });
    }

    // Find existing cart item first.
    const existingItem =
      await prisma.cartItem.findUnique({
        where: {
          userId_productId: {
            userId: req.user.id,
            productId,
          },
        },
      });

    const existingQuantity =
      existingItem?.quantity || 0;

    const newQuantity =
      existingQuantity + quantity;

    // IMPORTANT:
    // Validate the FINAL cart quantity against stock.
    if (newQuantity > product.stockQty) {
      return res.status(400).json({
        error: `Only ${product.stockQty} item${
          product.stockQty === 1 ? "" : "s"
        } available`,
      });
    }

    const item =
      await prisma.cartItem.upsert({
        where: {
          userId_productId: {
            userId: req.user.id,
            productId,
          },
        },
        update: {
          quantity: newQuantity,
        },
        create: {
          userId: req.user.id,
          productId,
          quantity,
        },
      });

    res.status(201).json(item);
  } catch (err) {
    console.error("Add to cart failed:", err);

    res.status(500).json({
      error: "Could not add product to cart",
    });
  }
});

// Update cart quantity
router.put("/cart/:productId", async (req, res) => {
  try {
    const schema = z.object({
      quantity: z.number().int().min(0),
    });

    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.errors[0].message,
      });
    }

    const { quantity } = parsed.data;
    const { productId } = req.params;

    // Quantity 0 means remove from cart.
    if (quantity === 0) {
      await prisma.cartItem.deleteMany({
        where: {
          userId: req.user.id,
          productId,
        },
      });

      return res.json({
        message: "Removed from cart",
      });
    }

    // Check that product exists and is active.
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.isActive) {
      return res.status(404).json({
        error: "Product not found",
      });
    }

    // IMPORTANT:
    // Never allow cart quantity above current stock.
    if (quantity > product.stockQty) {
      return res.status(400).json({
        error: `Only ${product.stockQty} item${
          product.stockQty === 1 ? "" : "s"
        } available`,
      });
    }

    const item =
      await prisma.cartItem.update({
        where: {
          userId_productId: {
            userId: req.user.id,
            productId,
          },
        },
        data: {
          quantity,
        },
      });

    res.json(item);
  } catch (err) {
    console.error(
      "Update cart quantity failed:",
      err
    );

    // Prisma record-not-found handling
    if (err.code === "P2025") {
      return res.status(404).json({
        error: "Cart item not found",
      });
    }

    res.status(500).json({
      error: "Could not update cart",
    });
  }
});

// Remove product from cart
router.delete("/cart/:productId", async (req, res) => {
  try {
    await prisma.cartItem.deleteMany({
      where: {
        userId: req.user.id,
        productId: req.params.productId,
      },
    });

    res.json({
      message: "Removed from cart",
    });
  } catch (err) {
    console.error(
      "Remove from cart failed:",
      err
    );

    res.status(500).json({
      error: "Could not remove product from cart",
    });
  }
});

// ============================================================
// WISHLIST
// ============================================================

router.get("/wishlist", async (req, res) => {
  const items = await prisma.wishlistItem.findMany({
    where: { userId: req.user.id },
    include: { product: true },
    orderBy: { createdAt: "desc" },
  });

  res.json(items);
});

router.post("/wishlist", async (req, res) => {
  const schema = z.object({
    productId: z.string().uuid(),
  });

  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: parsed.error.errors[0].message,
    });
  }

  const item =
    await prisma.wishlistItem.upsert({
      where: {
        userId_productId: {
          userId: req.user.id,
          productId: parsed.data.productId,
        },
      },
      update: {},
      create: {
        userId: req.user.id,
        productId: parsed.data.productId,
      },
    });

  res.status(201).json(item);
});

router.delete(
  "/wishlist/:productId",
  async (req, res) => {
    await prisma.wishlistItem.deleteMany({
      where: {
        userId: req.user.id,
        productId: req.params.productId,
      },
    });

    res.json({
      message: "Removed from wishlist",
    });
  }
);

export default router;