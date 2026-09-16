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
  },
  {
    timestamps: true,
  }
);

export const Product = mongoose.model("Product", productSchema);
