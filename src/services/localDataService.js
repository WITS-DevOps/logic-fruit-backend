import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the local database file (saved in backend/data/local_db.json)
const DATA_DIR = path.join(__dirname, "../../data");
const DB_FILE = path.join(DATA_DIR, "local_db.json");

/**
 * Ensures the data directory and database file exist.
 */
async function ensureDbFile() {
  await fs.promises.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.promises.access(DB_FILE, fs.constants.F_OK);
  } catch {
    // If the file does not exist, initialize it with an empty array
    await fs.promises.writeFile(DB_FILE, JSON.stringify([], null, 2), "utf8");
  }
}

/**
 * Reads all items from the local JSON database file.
 * @returns {Promise<Array>}
 */
async function readAllItems() {
  await ensureDbFile();
  try {
    const raw = await fs.promises.readFile(DB_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Error reading local_db.json:", error.message);
    return [];
  }
}

/**
 * Writes all items to the local JSON database file safely.
 * @param {Array} items
 */
async function writeAllItems(items) {
  await ensureDbFile();
  const tmpFile = `${DB_FILE}.tmp`;
  await fs.promises.writeFile(tmpFile, JSON.stringify(items, null, 2), "utf8");
  await fs.promises.rename(tmpFile, DB_FILE);
}

export const localDataService = {
  /**
   * Get all items for a given entity type (e.g. 'blog', 'news', 'product', 'whitepaper', 'job', 'category')
   */
  async getAll(entityType, filters = {}) {
    const all = await readAllItems();

    let items = all.filter((item) => item.entityType === entityType);

    if (filters.status && filters.status !== "all") {
      items = items.filter((item) => item.status === filters.status);
    }

    if (filters.category && filters.category !== "all") {
      items = items.filter((item) => item.category === filters.category);
    }

    if (filters.department && filters.department !== "All") {
      items = items.filter((item) => item.department === filters.department);
    }

    if (filters.type && filters.type !== "all") {
      items = items.filter((item) => item.type === filters.type);
    }

    // Sort items: items with custom numeric order first, then newest by createdAt
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
   * Get a single item by its ID or slug
   */
  async getById(id) {
    if (!id) return null;
    const all = await readAllItems();
    const cleanId = String(id).toLowerCase();
    return (
      all.find(
        (item) =>
          String(item.id || "").toLowerCase() === cleanId ||
          String(item._id || "").toLowerCase() === cleanId ||
          String(item.slug || "").toLowerCase() === cleanId
      ) || null
    );
  },

  /**
   * Get a single item by slug
   */
  async getBySlug(slug) {
    if (!slug) return null;
    const all = await readAllItems();
    const cleanSlug = slug.toLowerCase();
    return all.find((item) => (item.slug || "").toLowerCase() === cleanSlug) || null;
  },

  /**
   * Find item by slug or ID for a given entity type
   */
  async getBySlugOrId(entityType, slugOrId) {
    if (!slugOrId) return null;
    const all = await readAllItems();
    const cleanTarget = String(slugOrId).toLowerCase();

    return (
      all.find(
        (item) =>
          item.entityType === entityType &&
          ((item.slug || "").toLowerCase() === cleanTarget ||
            String(item.id || "").toLowerCase() === cleanTarget ||
            String(item._id || "").toLowerCase() === cleanTarget)
      ) || null
    );
  },

  /**
   * Check if a slug already exists
   */
  async slugExists(slug) {
    const item = await this.getBySlug(slug);
    return Boolean(item);
  },

  /**
   * Create a new item and save it to the local JSON file
   */
  async create(entityType, data) {
    const all = await readAllItems();
    const now = new Date().toISOString();
    const id = data.id || uuidv4();

    const newItem = {
      ...data,
      id,
      _id: id,
      entityType,
      createdAt: now,
      updatedAt: now,
    };

    all.push(newItem);
    await writeAllItems(all);

    return newItem;
  },

  /**
   * Update an existing item by ID or slug
   */
  async update(id, updates) {
    if (!id) return null;
    const all = await readAllItems();
    const cleanId = String(id).toLowerCase();
    const index = all.findIndex(
      (item) =>
        String(item.id || "").toLowerCase() === cleanId ||
        String(item._id || "").toLowerCase() === cleanId ||
        String(item.slug || "").toLowerCase() === cleanId
    );

    if (index === -1) {
      return null;
    }

    const existing = all[index];

    // If marking a product as Product of the Month, clear it from other products in the SAME category only
    if (existing.entityType === "product" && updates.isProductOfTheMonth === true) {
      const isHardwareType = (typeStr) => {
        const t = (typeStr || "").toLowerCase();
        return t.includes("hard") || t.includes("system") || t.includes("board");
      };
      const targetIsHardware = isHardwareType(updates.type || existing.type);

      for (const item of all) {
        if (item.entityType === "product" && item.id !== existing.id && item._id !== existing._id) {
          if (item.isProductOfTheMonth || item.productOfTheMonth) {
            const otherIsHardware = isHardwareType(item.type);
            if (otherIsHardware === targetIsHardware) {
              item.isProductOfTheMonth = false;
              item.productOfTheMonth = false;
            }
          }
        }
      }
    }

    const updatedItem = {
      ...existing,
      ...updates,
      id: existing.id,
      _id: existing._id,
      entityType: existing.entityType,
      updatedAt: new Date().toISOString(),
    };

    all[index] = updatedItem;
    await writeAllItems(all);

    return updatedItem;
  },

  /**
   * Reorder items for an entity by updating order indexes
   * Handles ID, _id, or slug mapping robustly
   */
  async reorder(entityType, orderedIds) {
    if (!Array.isArray(orderedIds)) return false;
    const all = await readAllItems();

    // Map each target ID/slug to its 0-indexed position
    const idMap = new Map();
    orderedIds.forEach((id, index) => {
      if (id !== undefined && id !== null) {
        idMap.set(String(id).toLowerCase(), index);
      }
    });

    let modified = false;

    for (const item of all) {
      if (entityType && item.entityType !== entityType) continue;

      const keyId = item.id ? String(item.id).toLowerCase() : null;
      const keyUnderscoreId = item._id ? String(item._id).toLowerCase() : null;
      const keySlug = item.slug ? String(item.slug).toLowerCase() : null;

      let targetIndex = undefined;
      if (keyId && idMap.has(keyId)) {
        targetIndex = idMap.get(keyId);
      } else if (keyUnderscoreId && idMap.has(keyUnderscoreId)) {
        targetIndex = idMap.get(keyUnderscoreId);
      } else if (keySlug && idMap.has(keySlug)) {
        targetIndex = idMap.get(keySlug);
      }

      if (targetIndex !== undefined) {
        item.order = targetIndex;
        item.updatedAt = new Date().toISOString();
        modified = true;
      }
    }

    if (modified) {
      await writeAllItems(all);
    }
    return true;
  },

  /**
   * Delete an item by ID or slug
   */
  async delete(id) {
    if (!id) return null;
    const all = await readAllItems();
    const cleanId = String(id).toLowerCase();
    const index = all.findIndex(
      (item) =>
        String(item.id || "").toLowerCase() === cleanId ||
        String(item._id || "").toLowerCase() === cleanId ||
        String(item.slug || "").toLowerCase() === cleanId
    );

    if (index === -1) {
      return null;
    }

    const [deleted] = all.splice(index, 1);
    await writeAllItems(all);

    return deleted || { id };
  },
};
