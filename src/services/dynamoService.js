import {
  QueryCommand,
  GetCommand,
  PutCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { getDocClient, TABLE_NAME } from "../config/dynamo.js";

export const dynamoService = {
  /**
   * Get all items for a given entity type (e.g., 'blog', 'news', 'whitepaper', 'product', 'job')
   * Supports status, category, department, and type filters.
   */
  async getAll(entityType, filters = {}) {
    const docClient = getDocClient();
    if (!docClient) throw new Error("DynamoDB is not configured");

    const filterExpressions = [];
    const expressionAttributeNames = {
      "#entityType": "entityType",
    };
    const expressionAttributeValues = {
      ":entityType": entityType,
    };

    // Filter by status (default published if not specified or 'all')
    if (filters.status && filters.status !== "all") {
      filterExpressions.push("#status = :status");
      expressionAttributeNames["#status"] = "status";
      expressionAttributeValues[":status"] = filters.status;
    }

    // Filter by category
    if (filters.category && filters.category !== "all") {
      filterExpressions.push("#category = :category");
      expressionAttributeNames["#category"] = "category";
      expressionAttributeValues[":category"] = filters.category;
    }

    // Filter by department (for jobs)
    if (filters.department && filters.department !== "All") {
      filterExpressions.push("#department = :department");
      expressionAttributeNames["#department"] = "department";
      expressionAttributeValues[":department"] = filters.department;
    }

    // Filter by type (for products)
    if (filters.type && filters.type !== "all" && entityType === "product") {
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
      ScanIndexForward: false, // Descending by createdAt (newest first)
    };

    if (filterExpressions.length > 0) {
      queryParams.FilterExpression = filterExpressions.join(" AND ");
    }

    const response = await docClient.send(new QueryCommand(queryParams));
    return response.Items || [];
  },

  /**
   * Get a single item by its ID
   */
  async getById(id) {
    const docClient = getDocClient();
    if (!docClient) throw new Error("DynamoDB is not configured");

    const response = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { id },
      })
    );

    return response.Item || null;
  },

  /**
   * Get a single item by slug
   */
  async getBySlug(slug) {
    const docClient = getDocClient();
    if (!docClient) throw new Error("DynamoDB is not configured");

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
    // 1. Try lookup by slug
    let item = await this.getBySlug(slugOrId);
    if (item && item.entityType === entityType) {
      return item;
    }

    // 2. Try lookup by ID
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
    const item = await this.getBySlug(slug);
    return Boolean(item);
  },

  /**
   * Create a new item
   */
  async create(entityType, data) {
    const docClient = getDocClient();
    if (!docClient) throw new Error("DynamoDB is not configured");

    const now = new Date().toISOString();
    const id = data.id || uuidv4();

    const newItem = {
      ...data,
      id,
      _id: id, // Provide _id for MongoDB frontend compatibility
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
    const docClient = getDocClient();
    if (!docClient) throw new Error("DynamoDB is not configured");

    const existing = await this.getById(id);
    if (!existing) {
      return null;
    }

    const updatedItem = {
      ...existing,
      ...updates,
      id,
      _id: id,
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
   * Delete an item by ID
   */
  async delete(id) {
    const docClient = getDocClient();
    if (!docClient) throw new Error("DynamoDB is not configured");

    const existing = await this.getById(id);
    if (!existing) {
      return null;
    }

    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { id },
      })
    );

    return { id };
  },
};
