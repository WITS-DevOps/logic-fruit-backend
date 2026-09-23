/**
 * Migration Script: Migrate Current Job Openings to AWS DynamoDB & AWS S3
 * 
 * Actions:
 *   1. Uploads job banner images to AWS S3 bucket under "current-openings-images/".
 *   2. Enriches each of the 7 jobs with strict ordering (0-6) and full SEO metadata.
 *   3. Inserts/updates all 7 job records in AWS DynamoDB (table: logicfruit_cms).
 *   4. Keeps backend/data/current_openings.json updated in sync.
 * 
 * Usage:
 *   node scripts/migrate_jobs_to_dynamo.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { PutCommand } from "@aws-sdk/lib-dynamodb";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, "../.env") });

import { getDocClient, TABLE_NAME } from "../src/config/dynamo.js";

const JOBS_FILE = path.join(__dirname, "../data/current_openings.json");
const IMAGES_DIR = path.join(__dirname, "../uploads/current-openings-images");
const BASE_URL = process.env.BASE_URL || "https://api.logic-fruit.com";

// Comprehensive SEO & Ordering metadata for the 7 job openings
const JOB_SEO_META = {
  "executive-assistant-to-ceo": {
    order: 0,
    metaTitle: "Executive Assistant to CEO | Careers at Logic Fruit Technologies",
    metaDescription: "Join Logic Fruit Technologies as Executive Assistant to CEO in Gurugram. Lead executive workflows, strategic calendar governance, and international stakeholder coordination.",
    metaKeywords: "Executive Assistant, EA to CEO, Executive Support, Strategic Management, Gurugram Jobs, Logic Fruit Careers, Chief Executive Support",
    canonicalUrl: "/jobs-current-opening/executive-assistant-to-ceo/",
    ogImage: `${BASE_URL}/api/upload/media/current-openings-images/assistant-to-ceo.jpg`,
    thumb: `${BASE_URL}/api/upload/media/current-openings-images/assistant-to-ceo.jpg`,
    heroImage: `${BASE_URL}/api/upload/media/current-openings-images/assistant-to-ceo.jpg`,
    images: [`${BASE_URL}/api/upload/media/current-openings-images/assistant-to-ceo.jpg`],
    noIndex: false,
  },
  "rf-architect": {
    order: 1,
    metaTitle: "RF Architect (5G NR & AAS) | Hardware Engineering Careers",
    metaDescription: "Join Logic Fruit Technologies as RF Architect in Gurugram/Bengaluru. Architect Active Antenna System (AAS) 5G NR radios, multi-band RF hardware chains, and radar systems.",
    metaKeywords: "RF Architect, 5G NR Radio, Active Antenna System, AAS, Microwave Engineering, VNA, NVNA, Antenna Calibration, Hardware Engineering, Logic Fruit Careers",
    canonicalUrl: "/jobs-current-opening/rf-architect/",
    ogImage: `${BASE_URL}/api/upload/media/current-openings-images/RF-Architect-Hardware-1024x1024.jpg`,
    thumb: `${BASE_URL}/api/upload/media/current-openings-images/RF-Architect-Hardware-1024x1024.jpg`,
    heroImage: `${BASE_URL}/api/upload/media/current-openings-images/RF-Architect-Hardware-1024x1024.jpg`,
    images: [`${BASE_URL}/api/upload/media/current-openings-images/RF-Architect-Hardware-1024x1024.jpg`],
    noIndex: false,
  },
  "verification-lead": {
    order: 2,
    metaTitle: "Verification Lead (UVM & SystemVerilog) | Careers at Logic Fruit",
    metaDescription: "Logic Fruit is hiring a Verification Lead in Gurugram. Manage verification teams, architect UVM testbenches, and drive coverage closure across PCIe, CXL, and Ethernet protocols.",
    metaKeywords: "Verification Lead, SystemVerilog, UVM, PCIe, CXL, Ethernet, Functional Coverage, Constrained Randomization, ASIC Verification, Logic Fruit",
    canonicalUrl: "/jobs-current-opening/verification-lead/",
    ogImage: `${BASE_URL}/api/upload/media/current-openings-images/Verification-Lead-Job-Post-banner.jpg`,
    thumb: `${BASE_URL}/api/upload/media/current-openings-images/Verification-Lead-Job-Post-banner.jpg`,
    heroImage: `${BASE_URL}/api/upload/media/current-openings-images/Verification-Lead-Job-Post-banner.jpg`,
    images: [`${BASE_URL}/api/upload/media/current-openings-images/Verification-Lead-Job-Post-banner.jpg`],
    noIndex: false,
  },
  "project-lead-fpga": {
    order: 3,
    metaTitle: "Project Lead - FPGA Design & IP Engineering | Logic Fruit Careers",
    metaDescription: "Apply as Project Lead - FPGA at Logic Fruit Technologies in Gurugram/Bengaluru. Lead RTL design, timing closure, and HW/SW integration for PCIe Gen5/Gen6 and 100G Ethernet platforms.",
    metaKeywords: "FPGA Project Lead, RTL Design, VHDL, Verilog, Xilinx Vivado, Intel Quartus, PCIe Gen5, 100G Ethernet, Timing Closure, Logic Fruit Careers",
    canonicalUrl: "/jobs-current-opening/project-lead-fpga/",
    ogImage: `${BASE_URL}/api/upload/media/current-openings-images/Project-Lead-FPGA-updated-1024x1024.jpg`,
    thumb: `${BASE_URL}/api/upload/media/current-openings-images/Project-Lead-FPGA-updated-1024x1024.jpg`,
    heroImage: `${BASE_URL}/api/upload/media/current-openings-images/Project-Lead-FPGA-updated-1024x1024.jpg`,
    images: [`${BASE_URL}/api/upload/media/current-openings-images/Project-Lead-FPGA-updated-1024x1024.jpg`],
    noIndex: false,
  },
  "it-expert": {
    order: 4,
    metaTitle: "IT Expert & Systems Infrastructure | Careers at Logic Fruit Technologies",
    metaDescription: "Join Logic Fruit as IT Expert in Gurugram. Manage enterprise Linux/Windows servers, cloud infrastructure (AWS/Azure), network security, and automated CI/CD DevOps workflows.",
    metaKeywords: "IT Expert, System Administrator, Network Security, AWS, Linux Administration, DevOps, AS9100D, Freshservice, Logic Fruit Careers",
    canonicalUrl: "/jobs-current-opening/it-expert/",
    ogImage: "https://www.logic-fruit.com/favicon.png",
    thumb: "",
    heroImage: "",
    images: [],
    noIndex: false,
  },
  "fpga-rtl-engineer": {
    order: 5,
    metaTitle: "FPGA RTL Engineer (PCIe, Ethernet, Vivado) | Careers at Logic Fruit",
    metaDescription: "Logic Fruit Technologies is hiring FPGA RTL Engineers in Gurugram/Bengaluru. Develop synthesizable VHDL/Verilog RTL, CDC structures, and high-speed PCIe Gen5/6 & 100G Ethernet pipelines.",
    metaKeywords: "FPGA RTL Engineer, VHDL, Verilog, Vivado, Quartus, CDC Analysis, PCIe Gen5, 100G Ethernet, Timing Closure, Logic Fruit Careers",
    canonicalUrl: "/jobs-current-opening/fpga-rtl-engineer/",
    ogImage: "https://www.logic-fruit.com/favicon.png",
    thumb: "",
    heroImage: "",
    images: [],
    noIndex: false,
  },
  "director-sr-director-fpga-hw-engineering": {
    order: 6,
    metaTitle: "Director / Sr Director - FPGA & Hardware Engineering | Logic Fruit",
    metaDescription: "Executive leadership role reporting directly to CEO. Lead 100+ engineer multi-site hardware organization, architectural innovation in AMD Versal & Agilex, and PCIe Gen6 platforms.",
    metaKeywords: "Director FPGA Engineering, Engineering Leadership, FPGA System Architecture, AMD Versal, Intel Agilex, PCIe Gen6, Hardware Leadership, Logic Fruit",
    canonicalUrl: "/jobs-current-opening/director-sr-director-fpga-hw-engineering/",
    ogImage: "https://www.logic-fruit.com/favicon.png",
    thumb: "",
    heroImage: "",
    images: [],
    noIndex: false,
  },
};

/**
 * Step 1: Upload local job image assets to AWS S3
 */
async function uploadImagesToS3() {
  console.log("--------------------------------------------------");
  console.log("Step 1: Uploading Job Images to AWS S3");
  console.log("Bucket:", process.env.AWS_S3_BUCKET_NAME || "Not set");
  console.log("--------------------------------------------------");

  if (!process.env.AWS_S3_BUCKET_NAME) {
    console.warn("Warning: AWS_S3_BUCKET_NAME is not set, skipping S3 image upload.");
    return;
  }

  const s3Client = new S3Client({
    region: process.env.AWS_REGION || "ap-south-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  if (!fs.existsSync(IMAGES_DIR)) {
    console.warn("Image directory not found:", IMAGES_DIR);
    return;
  }

  const files = await fs.promises.readdir(IMAGES_DIR);
  const imageFiles = files.filter((f) => /\.(jpe?g|png|webp|svg)$/i.test(f));

  console.log(`Found ${imageFiles.length} image file(s) to check/upload.`);

  for (const filename of imageFiles) {
    const filePath = path.join(IMAGES_DIR, filename);
    const fileBuffer = await fs.promises.readFile(filePath);
    const s3Key = `current-openings-images/${filename}`;

    const contentType = filename.toLowerCase().endsWith(".png")
      ? "image/png"
      : filename.toLowerCase().endsWith(".webp")
      ? "image/webp"
      : filename.toLowerCase().endsWith(".svg")
      ? "image/svg+xml"
      : "image/jpeg";

    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: s3Key,
          Body: fileBuffer,
          ContentType: contentType,
        })
      );
      console.log(`[S3 OK] Uploaded: ${s3Key} (${fileBuffer.length} bytes)`);
    } catch (err) {
      console.error(`[S3 FAIL] Failed uploading ${filename}:`, err.message);
    }
  }
}

/**
 * Step 2: Migrate enriched job records to AWS DynamoDB
 */
async function migrateJobsToDynamo() {
  console.log("\n--------------------------------------------------");
  console.log("Step 2: Migrating Job Openings to AWS DynamoDB");
  console.log("Target Table:", TABLE_NAME || "Not set");
  console.log("--------------------------------------------------");

  const docClient = getDocClient();
  if (!docClient) {
    console.error("Error: DynamoDB Document Client could not be initialized.");
    process.exit(1);
  }

  const raw = await fs.promises.readFile(JOBS_FILE, "utf8");
  const jobs = JSON.parse(raw);

  if (!Array.isArray(jobs) || jobs.length === 0) {
    console.log("No job openings found to migrate.");
    return;
  }

  console.log(`Found ${jobs.length} job opening(s) to process.\n`);

  const enrichedJobs = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    const seoMeta = JOB_SEO_META[job.slug] || {};

    const itemToSave = {
      ...job,
      entityType: "job",
      status: job.status || "published",
      order: typeof seoMeta.order === "number" ? seoMeta.order : i,
      metaTitle: seoMeta.metaTitle || `${job.title} | Careers at Logic Fruit Technologies`,
      metaDescription:
        seoMeta.metaDescription ||
        `${job.description} Explore exciting career opportunities at Logic Fruit Technologies.`,
      metaKeywords: seoMeta.metaKeywords || "Logic Fruit, Engineering Careers, Embedded, FPGA, Hardware",
      canonicalUrl: seoMeta.canonicalUrl || `/jobs-current-opening/${job.slug}/`,
      ogImage: seoMeta.ogImage || "https://www.logic-fruit.com/favicon.png",
      noIndex: Boolean(seoMeta.noIndex),
      thumb: seoMeta.thumb !== undefined ? seoMeta.thumb : (job.thumb || ""),
      heroImage: seoMeta.heroImage !== undefined ? seoMeta.heroImage : (job.heroImage || ""),
      images: Array.isArray(seoMeta.images) ? seoMeta.images : (job.images || []),
      updatedAt: new Date().toISOString(),
    };

    try {
      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: itemToSave,
        })
      );
      console.log(
        `[DynamoDB OK] Order ${itemToSave.order}: "${itemToSave.title}" (${itemToSave.slug})`
      );
      enrichedJobs.push(itemToSave);
      successCount++;
    } catch (err) {
      console.error(`[DynamoDB FAIL] Could not upload "${job.title}":`, err.message);
      enrichedJobs.push(itemToSave); // keep in synced file anyway
      failCount++;
    }
  }

  // Step 3: Write enriched data back to local JSON backup
  enrichedJobs.sort((a, b) => a.order - b.order);
  await fs.promises.writeFile(JOBS_FILE, JSON.stringify(enrichedJobs, null, 2), "utf8");
  console.log(`\n[Local Sync OK] Updated ${JOBS_FILE} with enriched SEO & S3 asset URLs.`);

  console.log("\n--------------------------------------------------");
  console.log(`Migration Complete: ${successCount} succeeded, ${failCount} failed.`);
  console.log("--------------------------------------------------");
}

async function run() {
  await uploadImagesToS3();
  await migrateJobsToDynamo();
}

run().catch((err) => {
  console.error("Fatal migration error:", err);
  process.exit(1);
});
