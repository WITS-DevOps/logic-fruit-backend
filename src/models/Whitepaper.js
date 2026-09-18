import mongoose from "mongoose";

const whitepaperSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please provide a whitepaper title"],
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
      default: "Whitepaper",
      trim: true,
    },
    date: {
      type: String,
      default: () => new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    },
    author: {
      type: String,
      default: "",
      trim: true,
    },
    authorRole: {
      type: String,
      default: "",
      trim: true,
    },
    img: {
      type: String,
      default: "", // Image cover URL (S3)
    },
    pdfUrl: {
      type: String,
      default: "", // Whitepaper PDF download URL (S3)
    },
    hasLivePdf: {
      type: Boolean,
      default: false,
    },
    overview: {
      type: [String],
      default: [],
    },
    whatYouLearn: {
      type: [String],
      default: [],
    },
    keyHighlights: {
      type: [String],
      default: [],
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

export const Whitepaper = mongoose.model("Whitepaper", whitepaperSchema);
