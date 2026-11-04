import mongoose from "mongoose";

const newsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please provide a news title"],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, "Please provide a slug"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    tag: {
      type: String,
      default: "Announcement",
      trim: true,
    },
    date: {
      type: String,
      default: () => new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    },
    location: {
      type: String,
      default: "",
      trim: true,
    },
    author: {
      type: String,
      default: "Logic Fruit Team",
      trim: true,
    },
    authorRole: {
      type: String,
      default: "Corporate Communications",
      trim: true,
    },
    authorImage: {
      type: String,
      default: "",
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
    externalUrl: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "published",
    },
    isProduction: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isPinned: {
      type: Boolean,
      default: false,
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
    cardTitle: {
      type: String,
      default: "",
      trim: true,
    },
    cardDescription: {
      type: String,
      default: "",
      trim: true,
    },
    buttonText: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const News = mongoose.model("News", newsSchema);
