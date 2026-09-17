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
      default: "Executive & Leadership",
      trim: true,
    },
    experience: {
      type: String,
      default: "5-9 Years",
      trim: true,
    },
    location: {
      type: String,
      default: "Gurugram",
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
      type: [String],
      default: [],
    },
    skills: {
      type: [String],
      default: [],
    },
    qualifications: {
      type: [String],
      default: [],
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

export const Job = mongoose.model("Job", jobSchema);
