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

    if (filters.type && filters.type !== "all" && entityType === "product") {
      items = items.filter((item) => item.type === filters.type);
    }

    // Sort descending by createdAt (newest first)
    items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    return items;
  },

  /**
   * Get a single item by its ID
   */
  async getById(id) {
    const all = await readAllItems();
    return all.find((item) => item.id === id || item._id === id) || null;
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
    const cleanTarget = slugOrId.toLowerCase();

    return (
      all.find(
        (item) =>
          item.entityType === entityType &&
          ((item.slug || "").toLowerCase() === cleanTarget ||
            item.id === slugOrId ||
            item._id === slugOrId)
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
   * Update an existing item by ID
   */
  async update(id, updates) {
    const all = await readAllItems();
    const index = all.findIndex((item) => item.id === id || item._id === id);

    if (index === -1) {
      return null;
    }

    const existing = all[index];
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
   * Delete an item by ID
   */
  async delete(id) {
    const all = await readAllItems();
    const index = all.findIndex((item) => item.id === id || item._id === id);

    if (index === -1) {
      return null;
    }

    all.splice(index, 1);
    await writeAllItems(all);

    return { id };
  },
};
