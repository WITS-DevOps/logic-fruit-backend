/**
 * Migration Script: Migrate Whitepapers & Associated Media/PDFs to AWS DynamoDB & AWS S3
 * 
 * Actions:
 *   1. Uploads whitepaper thumbnails and PDFs to AWS S3 under "whitepapers/<filename>".
 *   2. Copies files to local "backend/uploads/whitepapers/<filename>" for fallback.
 *   3. Enriches all 3 whitepapers with order (0-2), S3 asset streaming URLs, and full SEO metadata.
 *   4. Inserts all 3 items into AWS DynamoDB ("logicfruit_cms").
 *   5. Saves synchronized data to backend/data/whitepapers.json and backend/data/local_db.json.
 * 
 * Usage:
 *   node scripts/migrate_whitepapers_to_dynamo.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { PutCommand } from "@aws-sdk/lib-dynamodb";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

import { getDocClient, TABLE_NAME } from "../src/config/dynamo.js";

const WP_SOURCE_DIR = path.join(__dirname, "../../logic-fruit-ui/src/assets/img/whitepaper");
const WP_BACKUP_FILE = path.join(__dirname, "../data/whitepapers.json");
const LOCAL_DB_FILE = path.join(__dirname, "../data/local_db.json");
const LOCAL_UPLOADS_DIR = path.join(__dirname, "../uploads/whitepapers");

const S3_BUCKET = process.env.AWS_S3_BUCKET_NAME || "logicfruit-cms-assets-833823555826";
const AWS_REGION = process.env.AWS_REGION || "ap-south-1";

// 3 Authentic Whitepapers
const WHITEPAPER_DEFINITIONS = [
  {
    order: 0,
    slug: "the-role-of-fpgas-in-building-next-generation-test-measurement-systems",
    title: "The Role of FPGAs in Building Next-Generation Test & Measurement Systems",
    tag: "Cockpit",
    date: "July 24, 2026",
    author: "Rahul Sharma",
    authorRole: "FPGA Systems Architect",
    imageFilename: "wp-fpga-test-measurement.png",
    pdfFilename: "FPGAs_in_Next-Gen_Test_and_Measurement-version-1.2.pdf",
    overview: [
      "As modern electronic systems push into multi-gigabit speeds and complex RF domains, test and measurement equipment requires unprecedented agility and bandwidth.",
      "FPGAs deliver real-time reconfigurability, deterministic signal processing, and low-latency hardware acceleration required for modern oscilloscopes, spectrum analyzers, and automated test environments."
    ],
    whatYouLearn: [
      "How FPGA architectures overcome fixed-ASIC bottlenecks in modern test benches",
      "High-speed ADC/DAC interfacing using JESD204B/C protocols",
      "Techniques for real-time DSP, waveform generation, and automated protocol validation"
    ],
    keyHighlights: [
      "Deterministic low-latency signal acquisition pipelines",
      "Multi-gigabit serial interconnect integration",
      "Proven field case studies in avionics & defense test equipment"
    ],
    metaTitle: "FPGAs in Next-Gen Test & Measurement Systems | Whitepaper | Logic Fruit",
    metaDescription: "Download Logic Fruit's whitepaper on the role of FPGAs in next-generation test and measurement systems, high-speed ADC/DAC interfacing, and real-time DSP.",
    metaKeywords: "FPGA Test and Measurement, JESD204B, Oscilloscope Architecture, Real-Time DSP, Automated Test Equipment, Logic Fruit Technologies",
    canonicalUrl: "/whitepaper/the-role-of-fpgas-in-building-next-generation-test-measurement-systems",
    noIndex: false,
  },
  {
    order: 1,
    slug: "a-holistic-co-design-methodology-for-signal-power-and-thermal-integrity-in-amd-versal-adaptive-soc-platforms",
    title: "A Holistic Co-Design Methodology for Signal, Power, and Thermal Integrity in AMD Versal Adaptive SoC Platforms",
    tag: "Cockpit",
    date: "October 29, 2025",
    author: "Jaswant Singh",
    authorRole: "Hardware Design Lead",
    imageFilename: "wp-versal-adaptive-soc.jpg",
    pdfFilename: "",
    overview: [
      "Designing ultra-dense hardware around AMD Versal Adaptive SoC platforms introduces steep SI, PI, and thermal challenges.",
      "This whitepaper presents an end-to-end co-design methodology integrating 3D EM simulation, multi-rail PDN impedance budgeting, and board-level thermal dissipation strategies."
    ],
    whatYouLearn: [
      "Signal integrity guidelines for multi-gigabit PAM4/NRZ transceivers",
      "Power distribution network (PDN) design and target impedance optimization",
      "Thermal management techniques for high-density Versal packaging"
    ],
    keyHighlights: [
      "Comprehensive 3D EM and SPICE simulation workflows",
      "Decoupling capacitor placement and power plane optimization",
      "Thermal mitigation guidelines for mission-critical boards"
    ],
    metaTitle: "AMD Versal Co-Design: Signal, Power & Thermal Integrity | Logic Fruit",
    metaDescription: "In-depth engineering methodology for signal, power, and thermal co-design on AMD Versal Adaptive SoC platforms. Optimize high-speed transceivers and PDN impedance.",
    metaKeywords: "AMD Versal, Signal Integrity, Power Integrity, Thermal Design, PDN, High-Speed PCB, Logic Fruit Whitepaper",
    canonicalUrl: "/whitepaper/a-holistic-co-design-methodology-for-signal-power-and-thermal-integrity-in-amd-versal-adaptive-soc-platforms",
    noIndex: false,
  },
  {
    order: 2,
    slug: "adc-testing-with-lft-jesd204b-rx-ip-ported-on-efinix-evaluation-board",
    title: "ADC Testing with LFT JESD204B RX IP ported on Efinix Evaluation Board",
    tag: "Cockpit",
    date: "June 19, 2025",
    author: "Nitin Yadav",
    authorRole: "IP Core Specialist",
    imageFilename: "wp-jesd204b-rx-adc.jpg",
    pdfFilename: "",
    overview: [
      "Validating high-speed data converters requires robust receiver IP logic.",
      "This whitepaper walks through the complete porting, link synchronization (CGS, ILA), and multi-channel test bench verification of Logic Fruit's JESD204B RX IP core on the Efinix Ti180 evaluation platform."
    ],
    whatYouLearn: [
      "Architecture of Logic Fruit's JESD204B RX IP core",
      "Step-by-step porting and PHY transceiver configuration on Efinix Ti180",
      "Code Group Synchronization (CGS) and Initial Lane Alignment (ILA) validation"
    ],
    keyHighlights: [
      "Silicon-validated multi-lane JESD204B link establishment",
      "Real-time bit error rate (BER) and deterministic latency verification",
      "Rapid prototyping guide for high-speed ADC integration"
    ],
    metaTitle: "ADC Testing with LFT JESD204B RX IP on Efinix Board | Whitepaper",
    metaDescription: "Technical whitepaper detailing high-speed ADC testing with Logic Fruit JESD204B RX IP ported on Efinix Ti180 evaluation board. Protocol validation and timing closure.",
    metaKeywords: "JESD204B RX IP, Efinix Ti180, ADC Testing, High Speed Converter, FPGA IP Core, Logic Fruit Technologies",
    canonicalUrl: "/whitepaper/adc-testing-with-lft-jesd204b-rx-ip-ported-on-efinix-evaluation-board",
    noIndex: false,
  },
];

function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".svg") return "image/svg+xml";
  return "image/jpeg";
}

/**
 * Step 1: Upload whitepaper assets (images + PDF) to S3 and mirror locally
 */
async function uploadWhitepaperAssetsToS3(s3Client) {
  console.log("==================================================");
  console.log("Step 1: Uploading Whitepaper Assets to AWS S3");
  console.log("Target S3 Bucket:", S3_BUCKET);
  console.log("==================================================");

  if (!fs.existsSync(WP_SOURCE_DIR)) {
    console.warn("[WARN] Whitepaper source directory not found:", WP_SOURCE_DIR);
    return;
  }

  await fs.promises.mkdir(LOCAL_UPLOADS_DIR, { recursive: true });

  const filesToUpload = [
    "wp-fpga-test-measurement.png",
    "wp-versal-adaptive-soc.jpg",
    "wp-jesd204b-rx-adc.jpg",
    "whitepaper-thumb.png",
    "FPGAs_in_Next-Gen_Test_and_Measurement-version-1.2.pdf",
  ];

  let uploaded = 0;
  let errors = 0;

  for (const filename of filesToUpload) {
    const srcPath = path.join(WP_SOURCE_DIR, filename);
    if (!fs.existsSync(srcPath)) {
      console.warn(`  [WARN] File not found: ${srcPath}`);
      continue;
    }

    const destLocalPath = path.join(LOCAL_UPLOADS_DIR, filename);
    const s3Key = `whitepapers/${filename}`;
    const contentType = getMimeType(filename);
    const fileBuffer = await fs.promises.readFile(srcPath);

    // Copy locally
    await fs.promises.copyFile(srcPath, destLocalPath);

    // Upload to S3
    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: s3Key,
          Body: fileBuffer,
          ContentType: contentType,
        })
      );
      uploaded++;
      console.log(`  [S3 OK] ${s3Key} (${fileBuffer.length} bytes)`);
    } catch (err) {
      errors++;
      console.error(`  [S3 FAIL] ${s3Key}:`, err.message);
    }
  }

  console.log("\n--------------------------------------------------");
  console.log(`Whitepaper Upload Summary: ${uploaded} uploaded, ${errors} errors.`);
  console.log("--------------------------------------------------");
}

/**
 * Step 2: Migrate enriched whitepapers to DynamoDB
 */
async function migrateWhitepapersToDynamo(docClient) {
  console.log("\n==================================================");
  console.log("Step 2: Migrating Whitepapers to AWS DynamoDB");
  console.log("Target Table:", TABLE_NAME);
  console.log("==================================================");

  const now = new Date().toISOString();
  const enrichedWhitepapers = [];

  const baseUrl = process.env.BASE_URL || "https://api.logic-fruit.com";

  for (const wpDef of WHITEPAPER_DEFINITIONS) {
    const imageUrl = `${baseUrl}/api/upload/media/whitepapers/${wpDef.imageFilename}`;
    const pdfUrl = wpDef.pdfFilename
      ? `${baseUrl}/api/upload/media/whitepapers/${wpDef.pdfFilename}`
      : "";

    const wpId = `wp-${wpDef.slug}`;

    const wpItem = {
      id: wpId,
      _id: wpId,
      slug: wpDef.slug,
      title: wpDef.title,
      tag: wpDef.tag,
      date: wpDef.date,
      author: wpDef.author,
      authorRole: wpDef.authorRole,
      img: imageUrl,
      heroImage: imageUrl,
      thumb: imageUrl,
      pdfUrl: pdfUrl,
      hasLivePdf: Boolean(pdfUrl),
      overview: wpDef.overview,
      whatYouLearn: wpDef.whatYouLearn,
      keyHighlights: wpDef.keyHighlights,
      status: "published",
      entityType: "whitepaper",
      order: wpDef.order,
      metaTitle: wpDef.metaTitle,
      metaDescription: wpDef.metaDescription,
      metaKeywords: wpDef.metaKeywords,
      canonicalUrl: wpDef.canonicalUrl,
      ogImage: imageUrl,
      noIndex: wpDef.noIndex,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: wpItem,
        })
      );
      console.log(`[DynamoDB Whitepaper OK] Order ${wpItem.order}: "${wpItem.title}" (${wpItem.slug})`);
      enrichedWhitepapers.push(wpItem);
    } catch (err) {
      console.error(`[DynamoDB Whitepaper FAIL] ${wpDef.slug}:`, err.message);
      enrichedWhitepapers.push(wpItem);
    }
  }

  return enrichedWhitepapers;
}

/**
 * Step 3: Write enriched whitepapers to local backup files
 */
async function syncLocalBackups(whitepapers) {
  console.log("\n==================================================");
  console.log("Step 3: Synchronizing Local JSON Backup Files");
  console.log("==================================================");

  // 1. Write whitepapers.json
  await fs.promises.mkdir(path.dirname(WP_BACKUP_FILE), { recursive: true });
  await fs.promises.writeFile(WP_BACKUP_FILE, JSON.stringify(whitepapers, null, 2), "utf8");
  console.log(`[Sync OK] Written ${whitepapers.length} whitepapers to: ${WP_BACKUP_FILE}`);

  // 2. Synchronize local_db.json
  let localDb = [];
  if (fs.existsSync(LOCAL_DB_FILE)) {
    try {
      const raw = await fs.promises.readFile(LOCAL_DB_FILE, "utf8");
      localDb = JSON.parse(raw);
      if (!Array.isArray(localDb)) localDb = [];
    } catch (e) {
      localDb = [];
    }
  }

  // Remove existing whitepaper entities
  localDb = localDb.filter((item) => item.entityType !== "whitepaper");

  // Add the newly migrated whitepapers
  localDb.push(...whitepapers);

  await fs.promises.writeFile(LOCAL_DB_FILE, JSON.stringify(localDb, null, 2), "utf8");
  console.log(`[Sync OK] Synced ${whitepapers.length} whitepapers to ${LOCAL_DB_FILE}`);
}

async function run() {
  const s3Client = new S3Client({
    region: AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  const docClient = getDocClient();
  if (!docClient) {
    console.error("Error: DynamoDB document client could not be initialized.");
    process.exit(1);
  }

  // 1. Upload assets
  await uploadWhitepaperAssetsToS3(s3Client);

  // 2. Migrate whitepapers
  const whitepapers = await migrateWhitepapersToDynamo(docClient);

  // 3. Save local backup files
  await syncLocalBackups(whitepapers);

  console.log("\n==================================================");
  console.log("ALL WHITEPAPER MIGRATION STEPS COMPLETED SUCCESSFULLY!");
  console.log("==================================================");
}

run().catch((err) => {
  console.error("Fatal whitepaper migration error:", err);
  process.exit(1);
});
