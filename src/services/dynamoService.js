import {
  QueryCommand,
  GetCommand,
  PutCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { getDocClient, TABLE_NAME } from "../config/dynamo.js";
import { isLocalStorageActive } from "../config/storageMode.js";
import { localDataService } from "./localDataService.js";

export const dynamoService = {
  /**
   * Get all items for a given entity type (e.g., 'blog', 'news', 'whitepaper', 'product', 'job')
   */
  async getAll(entityType, filters = {}) {
    if (isLocalStorageActive()) {
      return localDataService.getAll(entityType, filters);
    }

    const docClient = getDocClient();
    if (!docClient) throw new Error("AWS DynamoDB is not configured");

    const filterExpressions = [];
    const expressionAttributeNames = {
      "#entityType": "entityType",
    };
    const expressionAttributeValues = {
      ":entityType": entityType,
    };

    if (filters.status && filters.status !== "all") {
      filterExpressions.push("#status = :status");
      expressionAttributeNames["#status"] = "status";
      expressionAttributeValues[":status"] = filters.status;
    }

    if (filters.category && filters.category !== "all") {
      filterExpressions.push("#category = :category");
      expressionAttributeNames["#category"] = "category";
      expressionAttributeValues[":category"] = filters.category;
    }

    if (filters.department && filters.department !== "All") {
      filterExpressions.push("#department = :department");
      expressionAttributeNames["#department"] = "department";
      expressionAttributeValues[":department"] = filters.department;
    }

    if (filters.type && filters.type !== "all") {
      filterExpressions.push("#prodType = :prodType");
      expressionAttributeNames["#prodType"] = "type";
      expressionAttributeValues[":prodType"] = filters.type;
    }

    const queryParams = {
      TableName: TABLE_NAME,
      IndexName: "EntityTypeIndex",
      KeyConditionExpression: "#entityType = :entityType",
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ScanIndexForward: false, // Descending by createdAt
    };

    if (filterExpressions.length > 0) {
      queryParams.FilterExpression = filterExpressions.join(" AND ");
    }

    const response = await docClient.send(new QueryCommand(queryParams));
    const items = response.Items || [];
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
   * Get a single item by its ID
   */
  async getById(id) {
    if (!id) return null;
    if (isLocalStorageActive()) {
      return localDataService.getById(id);
    }

    const docClient = getDocClient();
    if (!docClient) throw new Error("AWS DynamoDB is not configured");

    try {
      const response = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { id },
        })
      );

      if (response.Item) return response.Item;
    } catch (e) {
      // Continue to fallback
    }

    // Fallback: If not found by primary key 'id', query by slug
    return this.getBySlug(id);
  },

  /**
   * Get a single item by slug
   */
  async getBySlug(slug) {
    if (isLocalStorageActive()) {
      return localDataService.getBySlug(slug);
    }

    const docClient = getDocClient();
    if (!docClient) throw new Error("AWS DynamoDB is not configured");

    const response = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "SlugIndex",
        KeyConditionExpression: "#slug = :slug",
        ExpressionAttributeNames: {
          "#slug": "slug",
        },
        ExpressionAttributeValues: {
          ":slug": slug.toLowerCase(),
        },
      })
    );

    return response.Items && response.Items.length > 0 ? response.Items[0] : null;
  },

  /**
   * Find item by slug or ID for a given entity type
   */
  async getBySlugOrId(entityType, slugOrId) {
    if (isLocalStorageActive()) {
      return localDataService.getBySlugOrId(entityType, slugOrId);
    }

    let item = await this.getBySlug(slugOrId);
    if (item && item.entityType === entityType) {
      return item;
    }

    item = await this.getById(slugOrId);
    if (item && item.entityType === entityType) {
      return item;
    }

    return null;
  },

  /**
   * Check if a slug already exists
   */
  async slugExists(slug) {
    if (isLocalStorageActive()) {
      return localDataService.slugExists(slug);
    }

    const item = await this.getBySlug(slug);
    return Boolean(item);
  },

  /**
   * Create a new item
   */
  async create(entityType, data) {
    if (isLocalStorageActive()) {
      return localDataService.create(entityType, data);
    }

    const docClient = getDocClient();
    if (!docClient) throw new Error("AWS DynamoDB is not configured");

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

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: newItem,
      })
    );

    return newItem;
  },

  /**
   * Update an existing item by ID
   */
  async update(id, updates) {
    if (!id) return null;
    if (isLocalStorageActive()) {
      return localDataService.update(id, updates);
    }

    const docClient = getDocClient();
    if (!docClient) throw new Error("AWS DynamoDB is not configured");

    let existing = await this.getById(id);
    if (!existing) {
      existing = await this.getBySlug(id);
    }
    if (!existing) {
      return null;
    }

    const realId = existing.id || id;

    const updatedItem = {
      ...existing,
      ...updates,
      id: realId,
      _id: realId,
      entityType: existing.entityType,
      updatedAt: new Date().toISOString(),
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: updatedItem,
      })
    );

    return updatedItem;
  },

  /**
   * Reorder items for an entity by updating order indexes
   */
  async reorder(entityType, orderedIds) {
    if (isLocalStorageActive()) {
      return localDataService.reorder(entityType, orderedIds);
    }
    if (!Array.isArray(orderedIds)) return false;
    for (let i = 0; i < orderedIds.length; i++) {
      const id = orderedIds[i];
      try {
        await this.update(id, { order: i });
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
    if (isLocalStorageActive()) {
      return localDataService.delete(id);
    }

    const docClient = getDocClient();
    if (!docClient) throw new Error("AWS DynamoDB is not configured");

    let existing = await this.getById(id);
    if (!existing) {
      existing = await this.getBySlug(id);
    }
    if (!existing) {
      return null;
    }

    const realId = existing.id || id;

    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { id: realId },
      })
    );

    return { id: realId };
  },
};

