import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prismaClient.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import {
  slugify,
  calculateDiscountPct,
} from "../utils/pricing.js";

const router = Router();

// ============================================================
// CATEGORIES
// ============================================================

router.get("/categories", async (req, res) => {
  try {
    const categories =
      await prisma.category.findMany({
        where: {
          isActive: true,
        },

        orderBy: {
          sortOrder: "asc",
        },
      });

    return res.json(categories);
  } catch (err) {
    console.error(
      "Categories load error:",
      err
    );

    return res.status(500).json({
      error: "Could not load categories.",
    });
  }
});

router.post(
  "/categories",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const schema = z.object({
      name: z.string().min(1),
      imageUrl: z.string().optional(),
      sortOrder: z.number().optional(),
    });

    const parsed =
      schema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error:
          parsed.error.errors[0].message,
      });
    }

    const {
      name,
      imageUrl,
      sortOrder,
    } = parsed.data;

    try {
      const category =
        await prisma.category.create({
          data: {
            name: name.trim(),
            slug: slugify(name.trim()),
            imageUrl,
            sortOrder: sortOrder || 0,
          },
        });

      return res.status(201).json(category);
    } catch (err) {
      console.error(
        "Create category error:",
        err
      );

      return res.status(500).json({
        error: "Could not create category.",
      });
    }
  }
);

router.put(
  "/categories/:id",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const {
        name,
        imageUrl,
        isActive,
        sortOrder,
      } = req.body;

      const category =
        await prisma.category.update({
          where: {
            id: req.params.id,
          },

          data: {
            ...(name && {
              name: name.trim(),
              slug: slugify(name.trim()),
            }),

            ...(imageUrl !== undefined && {
              imageUrl,
            }),

            ...(isActive !== undefined && {
              isActive,
            }),

            ...(sortOrder !== undefined && {
              sortOrder,
            }),
          },
        });

      return res.json(category);
    } catch (err) {
      console.error(
        "Update category error:",
        err
      );

      return res.status(500).json({
        error: "Could not update category.",
      });
    }
  }
);

router.delete(
  "/categories/:id",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      await prisma.category.update({
        where: {
          id: req.params.id,
        },

        data: {
          isActive: false,
        },
      });

      return res.json({
        message: "Category deactivated",
      });
    } catch (err) {
      console.error(
        "Delete category error:",
        err
      );

      return res.status(500).json({
        error:
          "Could not deactivate category.",
      });
    }
  }
);

// ============================================================
// PRODUCTS
// ============================================================

// Customer product listing.
//
// Stock priority:
//   1. LOW STOCK
//   2. NORMAL STOCK
//   3. OUT OF STOCK
//
// This ordering is done AFTER retrieving the filtered products,
// so the customer sees products that actually need attention first.
//
// Note:
// Pagination is intentionally handled after stock-priority sorting
// to avoid pushing low-stock products onto later pages.
router.get("/products", async (req, res) => {
  try {
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
              ...(minPrice && {
                gte: Number(minPrice),
              }),

              ...(maxPrice && {
                lte: Number(maxPrice),
              }),
            },
          }
        : {}),
    };

    const requestedLimit = Math.min(
      Number(limit) || 20,
      100
    );

    const requestedPage = Math.max(
      Number(page) || 1,
      1
    );

    // Fetch all filtered products first.
    // This allows stock-priority sorting to happen
    // before pagination.
    const allProducts =
      await prisma.product.findMany({
        where,

        include: {
          category: true,
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    // --------------------------------------------------------
    // Stock priority
    // --------------------------------------------------------
    //
    // LOW STOCK:
    //   stock > 0 AND stock <= lowStockAlert
    //
    // NORMAL:
    //   stock > lowStockAlert
    //
    // OUT OF STOCK:
    //   stock === 0
    //
    // Lower priority number appears first.
    // --------------------------------------------------------

    const getStockPriority = (
      product
    ) => {
      const stock = Number(
        product.stockQty || 0
      );

      const alert = Number(
        product.lowStockAlert || 10
      );

      if (stock === 0) {
        return 2;
      }

      if (stock <= alert) {
        return 0;
      }

      return 1;
    };

    allProducts.sort((a, b) => {
      const priorityA =
        getStockPriority(a);

      const priorityB =
        getStockPriority(b);

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Within the same stock group,
      // newest products remain first.
      return (
        new Date(b.createdAt) -
        new Date(a.createdAt)
      );
    });

    const total =
      allProducts.length;

    const skip =
      (requestedPage - 1) *
      requestedLimit;

    const products =
      allProducts.slice(
        skip,
        skip + requestedLimit
      );

    return res.json({
      products,
      total,
      page: requestedPage,
      pageSize: requestedLimit,
      totalPages: Math.ceil(
        total / requestedLimit
      ),
    });
  } catch (err) {
    console.error(
      "Products load error:",
      err
    );

    return res.status(500).json({
      error: "Could not load products.",
    });
  }
});

// ============================================================
// SINGLE PRODUCT
// ============================================================

router.get(
  "/products/:idOrSlug",
  async (req, res) => {
    try {
      const {
        idOrSlug,
      } = req.params;

      const product =
        await prisma.product.findFirst({
          where: {
            OR: [
              {
                id: idOrSlug,
              },
              {
                slug: idOrSlug,
              },
            ],
          },

          include: {
            category: true,
          },
        });

      if (!product) {
        return res.status(404).json({
          error: "Product not found",
        });
      }

      return res.json(product);
    } catch (err) {
      console.error(
        "Product load error:",
        err
      );

      return res.status(500).json({
        error: "Could not load product.",
      });
    }
  }
);

// ============================================================
// PRODUCT VALIDATION
// ============================================================

const productSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  unit: z.string().min(1),
  mrp: z.number().positive(),
  sellingPrice: z.number().positive(),
  categoryId: z.string().uuid(),

  stockQty: z
    .number()
    .int()
    .min(0)
    .default(0),

  imageUrl: z.string().optional(),
  images: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

// ============================================================
// CREATE PRODUCT
// ============================================================

router.post(
  "/products",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const parsed =
      productSchema.safeParse(
        req.body
      );

    if (!parsed.success) {
      return res.status(400).json({
        error:
          parsed.error.errors[0].message,
      });
    }

    const data = parsed.data;

    const normalizedName =
      data.name.trim();

    const normalizedUnit =
      data.unit.trim();

    const existingProduct =
      await prisma.product.findFirst({
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
        productId:
          existingProduct.id,
      });
    }

    const discountPct =
      calculateDiscountPct(
        data.mrp,
        data.sellingPrice
      );

    try {
      const product =
        await prisma.product.create({
          data: {
            ...data,

            name: normalizedName,
            unit: normalizedUnit,

            slug: `${slugify(
              normalizedName
            )}-${Date.now().toString(36)}`,

            discountPct,
          },
        });

      return res.status(201).json(
        product
      );
    } catch (err) {
      console.error(
        "Create product error:",
        err
      );

      return res.status(500).json({
        error:
          "Could not create product",
      });
    }
  }
);

// ============================================================
// UPDATE PRODUCT
// ============================================================

router.put(
  "/products/:id",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const parsed =
      productSchema
        .partial()
        .safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error:
          parsed.error.errors[0].message,
      });
    }

    const data = parsed.data;

    try {
      if (data.name || data.unit) {
        const currentProduct =
          await prisma.product.findUnique(
            {
              where: {
                id: req.params.id,
              },
            }
          );

        if (!currentProduct) {
          return res.status(404).json({
            error:
              "Product not found",
          });
        }

        const checkName =
          (
            data.name ||
            currentProduct.name
          ).trim();

        const checkUnit =
          (
            data.unit ||
            currentProduct.unit
          ).trim();

        const duplicate =
          await prisma.product.findFirst(
            {
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
            }
          );

        if (duplicate) {
          return res.status(409).json({
            error: `Another product "${duplicate.name} (${duplicate.unit})" already exists.`,
            productId:
              duplicate.id,
          });
        }

        data.name = checkName;
        data.unit = checkUnit;
      }

      // Recalculate discount.
      if (
        data.mrp !== undefined &&
        data.sellingPrice !==
          undefined
      ) {
        data.discountPct =
          calculateDiscountPct(
            data.mrp,
            data.sellingPrice
          );
      } else if (
        data.mrp !== undefined ||
        data.sellingPrice !==
          undefined
      ) {
        const currentProduct =
          await prisma.product.findUnique(
            {
              where: {
                id: req.params.id,
              },
            }
          );

        if (!currentProduct) {
          return res.status(404).json({
            error:
              "Product not found",
          });
        }

        const mrp =
          data.mrp !== undefined
            ? data.mrp
            : Number(
                currentProduct.mrp
              );

        const sellingPrice =
          data.sellingPrice !==
          undefined
            ? data.sellingPrice
            : Number(
                currentProduct.sellingPrice
              );

        data.discountPct =
          calculateDiscountPct(
            mrp,
            sellingPrice
          );
      }

      const product =
        await prisma.product.update({
          where: {
            id: req.params.id,
          },

          data,
        });

      return res.json(product);
    } catch (err) {
      console.error(
        "Update product error:",
        err
      );

      return res.status(500).json({
        error:
          "Could not update product",
      });
    }
  }
);

// ============================================================
// REMOVE PRODUCT
// ============================================================

router.delete(
  "/products/:id",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      await prisma.product.update({
        where: {
          id: req.params.id,
        },

        data: {
          isActive: false,
        },
      });

      return res.json({
        message:
          "Product deactivated",
      });
    } catch (err) {
      console.error(
        "Delete product error:",
        err
      );

      return res.status(500).json({
        error:
          "Could not deactivate product.",
      });
    }
  }
);

// ============================================================
// INVENTORY
// ============================================================

router.patch(
  "/products/:id/stock",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const schema = z.object({
      stockQty: z
        .number()
        .int()
        .min(0),
    });

    const parsed =
      schema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error:
          parsed.error.errors[0].message,
      });
    }

    try {
      const product =
        await prisma.product.update({
          where: {
            id: req.params.id,
          },

          data: {
            stockQty:
              parsed.data.stockQty,
          },
        });

      return res.json(product);
    } catch (err) {
      console.error(
        "Stock update error:",
        err
      );

      return res.status(500).json({
        error:
          "Could not update stock.",
      });
    }
  }
);

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default router;