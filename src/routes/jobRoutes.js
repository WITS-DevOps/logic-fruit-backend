import express from "express";
import slugify from "slugify";
import { dynamoService } from "../services/dynamoService.js";

const router = express.Router();

/**
 * @route   GET /api/jobs
 * @desc    Get all job openings (supports status and department filter)
 */
router.get("/", async (req, res, next) => {
  try {
    const { status, department } = req.query;
    const filter = {
      department,
      status: status || "published",
    };

    const jobs = await dynamoService.getAll("job", filter);

    res.json({
      success: true,
      count: jobs.length,
      data: jobs,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/jobs/:slug
 * @desc    Get a single job opening by slug or ID
 */
router.get("/:slug", async (req, res, next) => {
  try {
    const { slug } = req.params;

    const job = await dynamoService.getBySlugOrId("job", slug);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job opening not found",
      });
    }

    res.json({
      success: true,
      data: job,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/jobs
 * @desc    Create a new job opening
 */
router.post("/", async (req, res, next) => {
  try {
    const {
      title,
      slug,
      department,
      experience,
      location,
      workSchedule,
      workMode,
      type,
      postedDate,
      thumb,
      heroImage,
      images,
      description,
      overview,
      responsibilities,
      skills,
      qualifications,
      status,
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Please provide a job title / role position",
      });
    }

    const generatedSlug = slug
      ? slugify(slug, { lower: true, strict: true })
      : slugify(title, { lower: true, strict: true });

    const exists = await dynamoService.slugExists(generatedSlug);
    if (exists) {
      return res.status(400).json({
        success: false,
        message: `A job opening with slug '${generatedSlug}' already exists. Please choose a different title or slug.`,
      });
    }

    const newJob = await dynamoService.create("job", {
      title,
      slug: generatedSlug,
      department: department || "",
      experience: experience || "",
      location: location || "",
      workSchedule: workSchedule || "",
      workMode: workMode || "On-site / Flexible",
      type: type || "Full-Time",
      postedDate:
        postedDate ||
        new Date().toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        }),
      thumb: thumb || "",
      heroImage: heroImage || "",
      images: Array.isArray(images) ? images : [],
      description: description || "",
      overview: overview || "",
      responsibilities: responsibilities || "",
      skills: Array.isArray(skills) ? skills : [],
      qualifications: qualifications || "",
      status: status || "published",
    });

    res.status(201).json({
      success: true,
      message: "Job opening created successfully",
      data: newJob,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/jobs/reorder
 * @desc    Reorder job openings
 */
router.put("/reorder", async (req, res, next) => {
  try {
    const { orderedIds } = req.body;
    await dynamoService.reorder("job", orderedIds);
    res.json({
      success: true,
      message: "Jobs reordered successfully",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/jobs/:id
 * @desc    Update a job opening
 */
router.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    // Defensive safeguard if request matches /:id instead of /reorder
    if (id === "reorder") {
      const { orderedIds } = req.body;
      await dynamoService.reorder("job", orderedIds);
      return res.json({
        success: true,
        message: "Jobs reordered successfully",
      });
    }

    const updates = { ...req.body };

    if (updates.title && !updates.slug) {
      updates.slug = slugify(updates.title, { lower: true, strict: true });
    } else if (updates.slug) {
      updates.slug = slugify(updates.slug, { lower: true, strict: true });
    }

    const updatedJob = await dynamoService.update(id, updates);

    if (!updatedJob) {
      return res.status(404).json({
        success: false,
        message: "Job opening not found to update",
      });
    }

    res.json({
      success: true,
      message: "Job opening updated successfully",
      data: updatedJob,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/jobs/:id
 * @desc    Delete a job opening
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await dynamoService.delete(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Job opening not found to delete",
      });
    }

    res.json({
      success: true,
      message: "Job opening deleted successfully",
      data: { id },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
