import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prismaClient.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

// ============================================================
// PROFILE
// ============================================================

router.get("/me", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id,
      },
    });

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    return res.json({
      id: user.id,
      phone: user.phone,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    console.error("Get profile error:", err);

    return res.status(500).json({
      error: "Could not load profile.",
    });
  }
});

router.put("/me", async (req, res) => {
  try {
    const schema = z.object({
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
    });

    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.errors[0].message,
      });
    }

    const user = await prisma.user.update({
      where: {
        id: req.user.id,
      },
      data: parsed.data,
    });

    return res.json({
      id: user.id,
      phone: user.phone,
      name: user.name,
      email: user.email,
    });
  } catch (err) {
    console.error("Update profile error:", err);

    return res.status(500).json({
      error: "Could not update profile.",
    });
  }
});

// ============================================================
// STORE CASH
// ============================================================

router.get("/store-cash", async (req, res) => {
  try {
    console.log("STORE CASH DEBUG - USER:", req.user);
    const storeCash = await prisma.storeCash.findUnique({
      where: {
        userId: req.user.id,
      },
      include: {
        transactions: {
          orderBy: {
            createdAt: "desc",
          },
          take: 100,
        },
      },
    });

    if (!storeCash) {
      return res.json({
        balance: 0,
        transactions: [],
      });
    }

    return res.json({
      balance: Number(storeCash.balance),
      transactions: storeCash.transactions.map((transaction) => ({
        id: transaction.id,
        type: transaction.type,
        amount: Number(transaction.amount),
        balanceBefore: Number(transaction.balanceBefore),
        balanceAfter: Number(transaction.balanceAfter),
        description: transaction.description,
        orderId: transaction.orderId,
        reference: transaction.reference,
        createdAt: transaction.createdAt,
      })),
    });
  } catch (err) {
    console.error("Get customer Store Cash error:", err);

    return res.status(500).json({
      error: "Could not load Store Cash.",
    });
  }
});

// ============================================================
// ADDRESSES
// ============================================================

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
  try {
    const addresses = await prisma.address.findMany({
      where: {
        userId: req.user.id,
      },
      orderBy: [
        {
          isDefault: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
    });

    return res.json(addresses);
  } catch (err) {
    console.error("Get addresses error:", err);

    return res.status(500).json({
      error: "Could not load addresses.",
    });
  }
});

router.post("/addresses", async (req, res) => {
  try {
    const parsed = addressSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.errors[0].message,
      });
    }

    if (parsed.data.isDefault) {
      await prisma.address.updateMany({
        where: {
          userId: req.user.id,
        },
        data: {
          isDefault: false,
        },
      });
    }

    const address = await prisma.address.create({
      data: {
        ...parsed.data,
        userId: req.user.id,
      },
    });

    return res.status(201).json(address);
  } catch (err) {
    console.error("Create address error:", err);

    return res.status(500).json({
      error: "Could not create address.",
    });
  }
});

router.put("/addresses/:id", async (req, res) => {
  try {
    const parsed = addressSchema.partial().safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.errors[0].message,
      });
    }

    const existing = await prisma.address.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!existing) {
      return res.status(404).json({
        error: "Address not found",
      });
    }

    if (parsed.data.isDefault) {
      await prisma.address.updateMany({
        where: {
          userId: req.user.id,
        },
        data: {
          isDefault: false,
        },
      });
    }

    const address = await prisma.address.update({
      where: {
        id: req.params.id,
      },
      data: parsed.data,
    });

    return res.json(address);
  } catch (err) {
    console.error("Update address error:", err);

    return res.status(500).json({
      error: "Could not update address.",
    });
  }
});

router.delete("/addresses/:id", async (req, res) => {
  try {
    const existing = await prisma.address.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!existing) {
      return res.status(404).json({
        error: "Address not found",
      });
    }

    await prisma.address.delete({
      where: {
        id: req.params.id,
      },
    });

    return res.json({
      message: "Address deleted",
    });
  } catch (err) {
    console.error("Delete address error:", err);

    return res.status(500).json({
      error: "Could not delete address.",
    });
  }
});

export default router;