import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prismaClient.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { slugify, calculateDiscountPct } from "../utils/pricing.js";

const router = Router();

// ---- Categories ----

router.get("/categories", async (req, res) => {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  res.json(categories);
});

router.post("/categories", requireAuth, requireAdmin, async (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    imageUrl: z.string().optional(),
    sortOrder: z.number().optional(),
  });

  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: parsed.error.errors[0].message,
    });
  }

  const { name, imageUrl, sortOrder } = parsed.data;

  const category = await prisma.category.create({
    data: {
      name: name.trim(),
      slug: slugify(name.trim()),
      imageUrl,
      sortOrder: sortOrder || 0,
    },
  });

  res.status(201).json(category);
});

router.put("/categories/:id", requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, imageUrl, isActive, sortOrder } = req.body;

  const category = await prisma.category.update({
    where: { id },
    data: {
      ...(name && {
        name: name.trim(),
        slug: slugify(name.trim()),
      }),
      ...(imageUrl !== undefined && { imageUrl }),
      ...(isActive !== undefined && { isActive }),
      ...(sortOrder !== undefined && { sortOrder }),
    },
  });

  res.json(category);
});

router.delete("/categories/:id", requireAuth, requireAdmin, async (req, res) => {
  await prisma.category.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });

  res.json({ message: "Category deactivated" });
});

// ---- Products ----

router.get("/products", async (req, res) => {
  const {
    q,
    category,
    minPrice,
    maxPrice,
    page = "1",
    limit = "20",
  } = req.query;

  const where = {
    isActive: true,

    ...(q && {
      name: {
        contains: String(q),
        mode: "insensitive",
      },
    }),

    ...(category && {
      category: {
        slug: String(category),
      },
    }),

    ...(minPrice || maxPrice
      ? {
          sellingPrice: {
            ...(minPrice && { gte: Number(minPrice) }),
            ...(maxPrice && { lte: Number(maxPrice) }),
          },
        }
      : {}),
  };

  const take = Math.min(Number(limit) || 20, 100);
  const skip =
    (Math.max(Number(page) || 1, 1) - 1) * take;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true },
      take,
      skip,
      orderBy: { createdAt: "desc" },
    }),

    prisma.product.count({ where }),
  ]);

  res.json({
    products,
    total,
    page: Number(page),
    pageSize: take,
  });
});

router.get("/products/:idOrSlug", async (req, res) => {
  const { idOrSlug } = req.params;

  const product = await prisma.product.findFirst({
    where: {
      OR: [
        { id: idOrSlug },
        { slug: idOrSlug },
      ],
    },
    include: { category: true },
  });

  if (!product) {
    return res.status(404).json({
      error: "Product not found",
    });
  }

  res.json(product);
});

// ---- Product validation ----

const productSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  unit: z.string().min(1),
  mrp: z.number().positive(),
  sellingPrice: z.number().positive(),
  categoryId: z.string().uuid(),
  stockQty: z.number().int().min(0).default(0),
  imageUrl: z.string().optional(),
  images: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

// ---- Create Product ----

router.post("/products", requireAuth, requireAdmin, async (req, res) => {
  const parsed = productSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: parsed.error.errors[0].message,
    });
  }

  const data = parsed.data;

  // Normalize product identity.
  const normalizedName = data.name.trim();
  const normalizedUnit = data.unit.trim();

  // -------------------------------------------------------
  // DUPLICATE PRODUCT PROTECTION
  // -------------------------------------------------------
  //
  // A product is considered duplicate when:
  //   - name is the same (case-insensitive)
  //   - unit is the same (case-insensitive)
  //   - product is still active
  //
  // Example:
  // Apples + KG
  // apples + kg
  //
  // These will be treated as the same product.
  // -------------------------------------------------------

  const existingProduct = await prisma.product.findFirst({
    where: {
      isActive: true,

      name: {
        equals: normalizedName,
        mode: "insensitive",
      },

      unit: {
        equals: normalizedUnit,
        mode: "insensitive",
      },
    },
  });

  if (existingProduct) {
    return res.status(409).json({
      error: `Product "${existingProduct.name} (${existingProduct.unit})" already exists.`,
      productId: existingProduct.id,
    });
  }

  const discountPct = calculateDiscountPct(
    data.mrp,
    data.sellingPrice
  );

  try {
    const product = await prisma.product.create({
      data: {
        ...data,
        name: normalizedName,
        unit: normalizedUnit,
        slug: `${slugify(normalizedName)}-${Date.now().toString(36)}`,
        discountPct,
      },
    });

    res.status(201).json(product);
  } catch (err) {
    console.error("Create product error:", err);

    res.status(500).json({
      error: "Could not create product",
    });
  }
});

// ---- Update Product ----

router.put("/products/:id", requireAuth, requireAdmin, async (req, res) => {
  const parsed = productSchema.partial().safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: parsed.error.errors[0].message,
    });
  }

  const data = parsed.data;

  // If name or unit is being changed, check for duplicates.
  if (data.name || data.unit) {
    const currentProduct = await prisma.product.findUnique({
      where: { id: req.params.id },
    });

    if (!currentProduct) {
      return res.status(404).json({
        error: "Product not found",
      });
    }

    const checkName = (data.name || currentProduct.name).trim();
    const checkUnit = (data.unit || currentProduct.unit).trim();

    const duplicate = await prisma.product.findFirst({
      where: {
        id: {
          not: req.params.id,
        },

        isActive: true,

        name: {
          equals: checkName,
          mode: "insensitive",
        },

        unit: {
          equals: checkUnit,
          mode: "insensitive",
        },
      },
    });

    if (duplicate) {
      return res.status(409).json({
        error: `Another product "${duplicate.name} (${duplicate.unit})" already exists.`,
        productId: duplicate.id,
      });
    }

    data.name = checkName;
    data.unit = checkUnit;
  }

  // Recalculate discount when price changes.
  if (
    data.mrp !== undefined &&
    data.sellingPrice !== undefined
  ) {
    data.discountPct = calculateDiscountPct(
      data.mrp,
      data.sellingPrice
    );
  } else if (
    data.mrp !== undefined ||
    data.sellingPrice !== undefined
  ) {
    const currentProduct = await prisma.product.findUnique({
      where: { id: req.params.id },
    });

    if (!currentProduct) {
      return res.status(404).json({
        error: "Product not found",
      });
    }

    const mrp =
      data.mrp !== undefined
        ? data.mrp
        : Number(currentProduct.mrp);

    const sellingPrice =
      data.sellingPrice !== undefined
        ? data.sellingPrice
        : Number(currentProduct.sellingPrice);

    data.discountPct = calculateDiscountPct(
      mrp,
      sellingPrice
    );
  }

  try {
    const product = await prisma.product.update({
      where: {
        id: req.params.id,
      },
      data,
    });

    res.json(product);
  } catch (err) {
    console.error("Update product error:", err);

    res.status(500).json({
      error: "Could not update product",
    });
  }
});

// ---- Remove Product ----

router.delete("/products/:id", requireAuth, requireAdmin, async (req, res) => {
  await prisma.product.update({
    where: { id: req.params.id },
    data: {
      isActive: false,
    },
  });

  res.json({
    message: "Product deactivated",
  });
});

// ---- Inventory ----

router.patch(
  "/products/:id/stock",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const schema = z.object({
      stockQty: z.number().int().min(0),
    });

    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.errors[0].message,
      });
    }

    const product = await prisma.product.update({
      where: {
        id: req.params.id,
      },

      data: {
        stockQty: parsed.data.stockQty,
      },
    });

    res.json(product);
  }
);

export default router;