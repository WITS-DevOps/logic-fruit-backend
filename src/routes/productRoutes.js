import express from "express";
import slugify from "slugify";
import { dynamoService } from "../services/dynamoService.js";

const router = express.Router();

/**
 * Helper to determine if an incoming request is from the Staging environment.
 * Checks query param (env=staging), custom header (X-Environment: staging),
 * or Origin / Referer matching STAGING_URL or vercel.app / localhost.
 */
function isStagingRequest(req) {
  // 1. Explicit query parameter or custom header
  const envParam = req.query?.env || req.headers?.["x-environment"] || "";
  if (typeof envParam === "string" && envParam.toLowerCase() === "staging") {
    return true;
  }

  // 2. Check Origin or Referer against configured staging URLs
  const origin = (req.headers?.origin || req.headers?.referer || "").toLowerCase();
  const stagingUrl = (process.env.STAGING_URL || "https://logic-fruit-ui.vercel.app").toLowerCase();
  const stagingOrigins = [
    stagingUrl,
    "logic-fruit-ui.vercel.app",
    "localhost",
    "127.0.0.1",
  ];

  return stagingOrigins.some((stg) => origin.includes(stg.replace(/^https?:\/\//, "")));
}

/**
 * @route   GET /api/products
 * @desc    Get all products (supports type and status filters, respects staging vs live production)
 */
router.get("/", async (req, res, next) => {
  try {
    const { type, status } = req.query;
    const filter = {
      type,
      status: status || "published",
    };

    let products = await dynamoService.getAll("product", filter);

    // Staging vs Production visibility rule:
    // 1. If requested by Admin CMS (status === "all"), return all products so admins can manage everything.
    // 2. If requested on Staging (Vercel / localhost), return all published products (both live and staging-only).
    // 3. If requested on Live Production, exclude products where isProduction is explicitly false.
    const isStaging = isStagingRequest(req);
    const isAdmin = status === "all";

    if (!isStaging && !isAdmin) {
      products = products.filter((p) => p.isProduction !== false);
    }

    res.json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/products/:slug
 * @desc    Get a single product by slug or ID (protected if staging-only)
 */
router.get("/:slug", async (req, res, next) => {
  try {
    const { slug } = req.params;

    const product = await dynamoService.getBySlugOrId("product", slug);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const isStaging = isStagingRequest(req);
    const isPreview = req.query.preview === "true";

    // If product is marked staging-only (isProduction === false) and accessed on live production, return 404
    if (!isStaging && !isPreview && product.isProduction === false) {
      return res.status(404).json({
        success: false,
        message: "Product not available in production",
      });
    }

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/products
 * @desc    Create a new product
 */
router.post("/", async (req, res, next) => {
  try {
    const {
      title,
      slug,
      type,
      feature,
      featureList,
      heroImage,
      galleryImages,
      blockDiagrams,
      videodesc,
      videourl,
      datasheetUrl,
      directDownload,
      status,
      metaTitle,
      metaDescription,
      metaKeywords,
      canonicalUrl,
      ogImage,
      noIndex,
      order,
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Please provide a product title",
      });
    }

    const generatedSlug = slug
      ? slugify(slug, { lower: true, strict: true })
      : slugify(title, { lower: true, strict: true });

    const exists = await dynamoService.slugExists(generatedSlug);
    if (exists) {
      return res.status(400).json({
        success: false,
        message: `A product with slug '${generatedSlug}' already exists. Please choose a different title or slug.`,
      });
    }

    const newProduct = await dynamoService.create("product", {
      title,
      slug: generatedSlug,
      type: type || "Hardware System",
      feature: feature || "",
      featureList: Array.isArray(featureList)
        ? featureList
        : featureList
        ? [featureList]
        : [],
      heroImage: heroImage || "",
      galleryImages: Array.isArray(galleryImages) ? galleryImages : [],
      blockDiagrams: Array.isArray(blockDiagrams) ? blockDiagrams : [],
      videodesc: videodesc || "",
      videourl: videourl || "",
      datasheetUrl: datasheetUrl || "",
      directDownload: directDownload === true || directDownload === "true",
      status: status || "published",
      isProduction: req.body.isProduction !== undefined ? Boolean(req.body.isProduction) : true,
      metaTitle: metaTitle || "",
      metaDescription: metaDescription || "",
      metaKeywords: metaKeywords || "",
      canonicalUrl: canonicalUrl || `/products/${generatedSlug}`,
      ogImage: ogImage || heroImage || "",
      noIndex: Boolean(noIndex),
      order: typeof order === "number" ? order : 0,
    });

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: newProduct,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/products/reorder
 * @desc    Reorder products
 */
router.put("/reorder", async (req, res, next) => {
  try {
    const { orderedIds } = req.body;
    await dynamoService.reorder("product", orderedIds);
    res.json({
      success: true,
      message: "Products reordered successfully",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/products/:id
 * @desc    Update a product
 */
router.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    // Defensive safeguard if request matches /:id instead of /reorder
    if (id === "reorder") {
      const { orderedIds } = req.body;
      await dynamoService.reorder("product", orderedIds);
      return res.json({
        success: true,
        message: "Products reordered successfully",
      });
    }

    const updates = { ...req.body };
    if (updates.isProduction !== undefined) {
      updates.isProduction = Boolean(updates.isProduction);
    }

    // Helper to check if a product is Hardware System vs Soft IP
    const isHardwareType = (typeStr) => {
      const t = (typeStr || "").toLowerCase();
      return t.includes("hard") || t.includes("system") || t.includes("board");
    };

    // If making this product the Product of the Month, clear other products in the SAME category only
    // This allows 1 POTM for Hardware Systems and 1 POTM for Soft IP Cores
    if (updates.isProductOfTheMonth === true) {
      try {
        const currentProd = await dynamoService.getBySlugOrId("product", id);
        const targetType = updates.type || currentProd?.type || "";
        const targetIsHardware = isHardwareType(targetType);

        const allProducts = await dynamoService.getAll("product");
        for (const prod of allProducts) {
          const pId = prod.id || prod._id;
          if (pId !== id && (prod.isProductOfTheMonth || prod.productOfTheMonth)) {
            const otherIsHardware = isHardwareType(prod.type);
            if (otherIsHardware === targetIsHardware) {
              await dynamoService.update(pId, { isProductOfTheMonth: false });
            }
          }
        }
      } catch (e) {
        console.warn("Error unsetting other products of the month in same category:", e.message);
      }
    }

    if (updates.title && !updates.slug) {
      updates.slug = slugify(updates.title, { lower: true, strict: true });
    } else if (updates.slug) {
      updates.slug = slugify(updates.slug, { lower: true, strict: true });
    }

    const updatedProduct = await dynamoService.update(id, updates);

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found to update",
      });
    }

    res.json({
      success: true,
      message: "Product updated successfully",
      data: updatedProduct,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/products/:id
 * @desc    Delete a product
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await dynamoService.delete(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Product not found to delete",
      });
    }

    res.json({
      success: true,
      message: "Product deleted successfully",
      data: { id },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
