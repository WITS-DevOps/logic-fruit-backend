import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please provide a job title / role position"],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, "Please provide a slug"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    department: {
      type: String,
      default: "",
      trim: true,
    },
    experience: {
      type: String,
      default: "",
      trim: true,
    },
    location: {
      type: String,
      default: "",
      trim: true,
    },
    workSchedule: {
      type: String,
      default: "",
      trim: true,
    },
    workMode: {
      type: String,
      default: "On-site / Flexible",
      trim: true,
    },
    type: {
      type: String,
      default: "Full-Time",
      trim: true,
    },
    postedDate: {
      type: String,
      default: () =>
        new Date().toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        }),
    },
    thumb: {
      type: String,
      default: "",
      trim: true,
    },
    heroImage: {
      type: String,
      default: "",
      trim: true,
    },
    images: {
      type: [String],
      default: [],
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    overview: {
      type: String,
      default: "",
      trim: true,
    },
    responsibilities: {
      type: mongoose.Schema.Types.Mixed,
      default: "",
    },
    skills: {
      type: [String],
      default: [],
    },
    qualifications: {
      type: mongoose.Schema.Types.Mixed,
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

export const Job = mongoose.model("Job", jobSchema);
