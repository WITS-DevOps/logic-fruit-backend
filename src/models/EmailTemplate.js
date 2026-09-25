import mongoose from "mongoose";

/**
 * EmailTemplate Schema
 * Stores customizable email templates for autoresponders and internal notifications.
 */
const emailTemplateSchema = new mongoose.Schema(
  {
    templateKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    target: {
      type: String,
      enum: ["visitor", "internal"],
      default: "visitor",
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    senderName: {
      type: String,
      default: "Jaswant from Logic Fruit",
      trim: true,
    },
    replyTo: {
      type: String,
      default: "jaswant.singh@logic-fruit.com",
      trim: true,
    },
    headerTitle: {
      type: String,
      default: "Logic Fruit Technologies",
    },
    headerSubtitle: {
      type: String,
      default: "Embedded Systems • FPGA • High Speed Digital Systems",
    },
    bannerImageUrl: {
      type: String,
      default: "",
    },
    greeting: {
      type: String,
      default: "Dear {{name}},",
    },
    mainMessage: {
      type: String,
      default: "",
    },
    showDownloadButton: {
      type: Boolean,
      default: true,
    },
    buttonText: {
      type: String,
      default: "Download PDF",
    },
    buttonUrl: {
      type: String,
      default: "{{downloadUrl}}",
    },
    secondaryMessage: {
      type: String,
      default: "",
    },
    internalRecipientsOverride: {
      type: String,
      default: "", // If empty, falls back to INTERNAL_LEAD_EMAILS env variable
    },
    footerText: {
      type: String,
      default: "Logic Fruit Technologies • Innovative Embedded & Digital System Engineering\nPlot No. 109, Sector 44, Gurugram, Haryana 122003, India",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const EmailTemplate = mongoose.model("EmailTemplate", emailTemplateSchema);

export default EmailTemplate;
