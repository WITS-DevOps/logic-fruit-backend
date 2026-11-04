import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

// Schema for generic CMS Items stored in MongoDB
const CmsItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    _id: { type: String },
    entityType: { type: String, required: true, index: true },
    slug: { type: String, index: true },
    status: { type: String, index: true },
    category: { type: String, index: true },
    department: { type: String, index: true },
    type: { type: String, index: true },
    order: { type: Number },
    createdAt: { type: String },
    updatedAt: { type: String },
  },
  { strict: false, timestamps: false }
);

export const CmsItem = mongoose.models.CmsItem || mongoose.model("CmsItem", CmsItemSchema, "cms_items");

export const isMongoActive = () => Boolean(process.env.MONGODB_URI);

export const mongoDataService = {
  /**
   * Get all items for a given entity type (e.g. 'blog', 'news', 'product', 'whitepaper', 'job', 'inquiry')
   */
  async getAll(entityType, filters = {}) {
    const query = { entityType };

    if (filters.status && filters.status !== "all") {
      query.status = filters.status;
    }
    if (filters.category && filters.category !== "all") {
      query.category = filters.category;
    }
    if (filters.department && filters.department !== "All") {
      query.department = filters.department;
    }
    if (filters.type && filters.type !== "all") {
      query.type = filters.type;
    }

    const items = await CmsItem.find(query).lean();

    items.sort((a, b) => {
      const aOrder = typeof a.order === "number" ? a.order : Infinity;
      const bOrder = typeof b.order === "number" ? b.order : Infinity;
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    return items;
  },

  /**
   * Get a single item by ID (or fallback to slug)
   */
  async getById(id) {
    if (!id) return null;
    let item = await CmsItem.findOne({ id }).lean();
    if (!item) {
      item = await CmsItem.findOne({ slug: id.toLowerCase() }).lean();
    }
    return item;
  },

  /**
   * Get a single item by slug
   */
  async getBySlug(slug) {
    if (!slug) return null;
    return CmsItem.findOne({ slug: slug.toLowerCase() }).lean();
  },

  /**
   * Get item by slug or ID for a specific entity type
   */
  async getBySlugOrId(entityType, slugOrId) {
    if (!slugOrId) return null;
    let item = await CmsItem.findOne({ entityType, slug: slugOrId.toLowerCase() }).lean();
    if (!item) {
      item = await CmsItem.findOne({ entityType, id: slugOrId }).lean();
    }
    return item;
  },

  /**
   * Check if slug already exists
   */
  async slugExists(slug) {
    if (!slug) return false;
    const count = await CmsItem.countDocuments({ slug: slug.toLowerCase() });
    return count > 0;
  },

  /**
   * Create a new item
   */
  async create(entityType, data) {
    const now = new Date().toISOString();
    const id = data.id || uuidv4();
    const newItem = {
      ...data,
      id,
      _id: id,
      entityType,
      createdAt: data.createdAt || now,
      updatedAt: now,
    };
    await CmsItem.create(newItem);
    return newItem;
  },

  /**
   * Update an existing item by ID
   */
  async update(id, updates) {
    if (!id) return null;
    let existing = await this.getById(id);
    if (!existing) {
      existing = await this.getBySlug(id);
    }
    if (!existing) return null;

    const realId = existing.id || id;
    const updatedItem = {
      ...existing,
      ...updates,
      id: realId,
      _id: realId,
      entityType: existing.entityType,
      updatedAt: new Date().toISOString(),
    };

    await CmsItem.findOneAndUpdate({ id: realId }, updatedItem, { new: true, upsert: true });
    return updatedItem;
  },

  /**
   * Reorder items
   */
  async reorder(entityType, orderedIds) {
    if (!Array.isArray(orderedIds)) return false;
    for (let i = 0; i < orderedIds.length; i++) {
      const id = orderedIds[i];
      try {
        await CmsItem.updateOne({ id }, { $set: { order: i } });
      } catch (e) {
        console.warn(`Could not update order for item ${id}:`, e.message);
      }
    }
    return true;
  },

  /**
   * Delete an item by ID
   */
  async delete(id) {
    if (!id) return null;
    let existing = await this.getById(id);
    if (!existing) {
      existing = await this.getBySlug(id);
    }
    if (!existing) return null;

    const realId = existing.id || id;
    await CmsItem.deleteOne({ id: realId });
    return { id: realId };
  },
};
