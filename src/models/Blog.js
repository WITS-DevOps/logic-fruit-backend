import mongoose from "mongoose";

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please provide a blog title"],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, "Please provide a slug"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    category: {
      type: String,
      default: "all",
      trim: true,
    },
    tag: {
      type: String,
      default: "Article",
      trim: true,
    },
    author: {
      type: String,
      default: "Logic Fruit Team",
      trim: true,
    },
    authorRole: {
      type: String,
      default: "",
      trim: true,
    },
    readTime: {
      type: String,
      default: "5 min read",
      trim: true,
    },
    date: {
      type: String,
      default: () => new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    },
    heroImage: {
      type: String,
      default: "",
    },
    excerpt: {
      type: String,
      default: "",
    },
    contentMarkdown: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "published",
    },
    metaTitle: {
      type: String,
      default: "",
      trim: true,
    },
    metaDescription: {
      type: String,
      default: "",
      trim: true,
    },
    metaKeywords: {
      type: String,
      default: "",
      trim: true,
    },
    canonicalUrl: {
      type: String,
      default: "",
      trim: true,
    },
    ogImage: {
      type: String,
      default: "",
      trim: true,
    },
    noIndex: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const Blog = mongoose.model("Blog", blogSchema);
