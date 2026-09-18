import express from "express";
import slugify from "slugify";
import { dynamoService } from "../services/dynamoService.js";

const router = express.Router();

/**
 * @route   GET /api/products
 * @desc    Get all products (supports type and status filters)
 */
router.get("/", async (req, res, next) => {
  try {
    const { type, status } = req.query;
    const filter = {
      type,
      status: status || "published",
    };

    const products = await dynamoService.getAll("product", filter);

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
 * @desc    Get a single product by slug or ID
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

    // If making this product the Product of the Month, clear any other products
    if (updates.isProductOfTheMonth === true) {
      try {
        const allProducts = await dynamoService.getAll("product");
        for (const prod of allProducts) {
          const pId = prod.id || prod._id;
          if (pId !== id && (prod.isProductOfTheMonth || prod.productOfTheMonth)) {
            await dynamoService.update(pId, { isProductOfTheMonth: false });
          }
        }
      } catch (e) {
        console.warn("Error unsetting other products of the month:", e.message);
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
