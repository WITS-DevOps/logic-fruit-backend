import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please provide a product title"],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, "Please provide a product slug"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    type: {
      type: String,
      default: "System /Board",
      trim: true,
    },
    feature: {
      type: String,
      default: "",
    },
    featureList: {
      type: [String],
      default: [],
    },
    heroImage: {
      type: String,
      default: "",
    },
    galleryImages: {
      type: [String],
      default: [],
    },
    videodesc: {
      type: String,
      default: "",
    },
    videourl: {
      type: String,
      default: "",
    },
    datasheetUrl: {
      type: String,
      default: "",
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
    isProductOfTheMonth: {
      type: Boolean,
      default: false,
    },
    overviewHeadline: {
      type: String,
      default: "",
    },
    featuresSubtitle: {
      type: String,
      default: "",
    },
    featureBadges: {
      type: [String],
      default: [],
    },
    faqs: [
      {
        question: { type: String, trim: true },
        answer: { type: String, trim: true },
      },
    ],
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

export const Product = mongoose.model("Product", productSchema);
