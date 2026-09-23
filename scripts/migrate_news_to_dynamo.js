/**
 * Migration Script: Migrate Authentic News Announcements & Images to AWS DynamoDB & AWS S3
 * 
 * Actions:
 *   1. Uploads all 13 news images across all 7 news releases to AWS S3 under "news/<slug>/<filename>".
 *   2. Copies image files to local "backend/uploads/news/<slug>/<filename>" for fallback.
 *   3. Rewrites markdown image links to S3 media streaming endpoints.
 *   4. Enriches each news article with ordering (0-6) and full SEO metadata.
 *   5. Inserts all 7 news items into AWS DynamoDB ("logicfruit_cms").
 *   6. Saves synchronized data to backend/data/news.json and backend/data/local_db.json.
 * 
 * Usage:
 *   node scripts/migrate_news_to_dynamo.js
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

const NEWS_SOURCE_DIR = path.join(__dirname, "../../logic-fruit-ui/src/assets/img/news-data/news");
const NEWS_BACKUP_FILE = path.join(__dirname, "../data/news.json");
const LOCAL_DB_FILE = path.join(__dirname, "../data/local_db.json");
const LOCAL_UPLOADS_DIR = path.join(__dirname, "../uploads/news");

const S3_BUCKET = process.env.AWS_S3_BUCKET_NAME || "logicfruit-cms-assets-833823555826";
const AWS_REGION = process.env.AWS_REGION || "ap-south-1";

// 8 News Articles with authoritative metadata, ordering, and SEO configurations
const NEWS_DEFINITIONS = [
  {
    order: 0,
    slug: "logic-fruit-technologies-unveils-l-qntxt-security-platform-for-hsms-silicon-and-embedded-systems",
    title: "Logic Fruit Technologies Unveils L-QNTX™ Security Platform for HSMs, Silicon and Embedded Systems",
    tag: "Product Announcement",
    date: "September 23, 2026",
    location: "Gurugram, India",
    heroFilename: "hero-l-qntxt-security-platform.png",
    metaTitle: "Logic Fruit Unveils L-QNTX™ Security Platform for HSMs & Silicon | Press Release",
    metaDescription: "Logic Fruit Technologies introduces L-QNTX™, a crypto-agile quantum-safe security platform spanning licensable Soft IP, embedded hardware root of trust, and PCIe/network HSMs.",
    metaKeywords: "L-QNTX™, Quantum Safe Security, Hardware Security Module, HSM, Post Quantum Cryptography, PQC, ML-KEM, ML-DSA, FIPS 203, FIPS 140-3, Logic Fruit Technologies, Semiconductor Security",
    canonicalUrl: "/news/logic-fruit-technologies-unveils-l-qntxt-security-platform-for-hsms-silicon-and-embedded-systems",
    noIndex: false,
  },
  {
    order: 1,
    slug: "logic-fruit-technologies-appoints-sunil-kar-as-president-ceo-to-accelerate-global-growth",
    title: "Logic Fruit Technologies Appoints Sunil Kar as President & CEO to Accelerate Global Growth",
    tag: "Leadership Announcement",
    date: "November 04, 2025",
    location: "Gurgaon, India",
    heroFilename: "hero-sunil-kar-pr-thumbnail-1.jpg",
    metaTitle: "Logic Fruit Appoints Sunil Kar as President & CEO | Press Release",
    metaDescription: "Logic Fruit Technologies appoints semiconductor & systems veteran Sunil Kar as President and CEO to lead international expansion and engineering scaling.",
    metaKeywords: "Sunil Kar, CEO Logic Fruit, Engineering Leadership, Executive Appointment, Semiconductor, Embedded Systems, Logic Fruit News",
    canonicalUrl: "/news/logic-fruit-technologies-appoints-sunil-kar-as-president-ceo-to-accelerate-global-growth",
    noIndex: false,
  },
  {
    order: 2,
    slug: "logic-fruit-technologies-releases-high-speed-interface-ips-stack-for-advanced-computing",
    title: "Logic Fruit Technologies Releases High-Speed Interface IPs Stack for Advanced Computing",
    tag: "Product Release",
    date: "August 20, 2025",
    location: "San Jose, CA & Gurgaon, India",
    heroFilename: "hero-High-Speed-Interface-IP-PR-2.jpg",
    metaTitle: "High-Speed Interface IPs Stack Released for Advanced Computing | Logic Fruit",
    metaDescription: "Logic Fruit Technologies introduces comprehensive high-speed interface IP stack featuring PCIe Gen6, CXL, and Ethernet controller IP cores for next-generation computing.",
    metaKeywords: "High Speed Interface IP, PCIe Gen6, CXL, Ethernet IP, FPGA IP, Advanced Computing, Logic Fruit Technologies, Product Release",
    canonicalUrl: "/news/logic-fruit-technologies-releases-high-speed-interface-ips-stack-for-advanced-computing",
    noIndex: false,
  },
  {
    order: 3,
    slug: "logic-fruit-technologies-to-exhibit-advanced-avionics-solutions-at-aerospace-tech-week-europe-2025",
    title: "Logic Fruit Technologies to Exhibit Advanced Avionics Solutions at Aerospace Tech Week Europe 2025",
    tag: "Global Event",
    date: "March 18, 2025",
    location: "Munich, Germany",
    heroFilename: "hero-Aerospace-Tech-1.jpg",
    metaTitle: "Advanced Avionics at Aerospace Tech Week Europe 2025 | Logic Fruit",
    metaDescription: "Logic Fruit Technologies to showcase mission-critical ARINC 818, DO-254 compliant FPGA solutions, and avionics display systems at Aerospace Tech Week Europe 2025 in Munich.",
    metaKeywords: "Aerospace Tech Week Europe 2025, ARINC 818, Avionics Systems, DO-254, Aerospace Engineering, Logic Fruit Technologies",
    canonicalUrl: "/news/logic-fruit-technologies-to-exhibit-advanced-avionics-solutions-at-aerospace-tech-week-europe-2025",
    noIndex: false,
  },
  {
    order: 4,
    slug: "logic-fruit-technologies-to-showcase-innovations-at-embedded-world-europe-2025",
    title: "Logic Fruit Technologies to Showcase Innovations at Embedded World Europe 2025",
    tag: "Industry Exhibition",
    date: "March 11, 2025",
    location: "Nuremberg, Germany",
    heroFilename: "hero-Embedded-World.jpg",
    metaTitle: "Embedded World Europe 2025 Showcase | Logic Fruit Technologies",
    metaDescription: "Experience Logic Fruit's latest embedded FPGA platforms, heterogeneous compute modules, and high-speed data acquisition systems live at Embedded World Nuremberg 2025.",
    metaKeywords: "Embedded World 2025, Nuremberg, Embedded Systems, FPGA Acceleration, Data Acquisition, Logic Fruit Innovations",
    canonicalUrl: "/news/logic-fruit-technologies-to-showcase-innovations-at-embedded-world-europe-2025",
    noIndex: false,
  },
  {
    order: 5,
    slug: "paras-defence-invests-in-logic-fruit-technologies-to-boost-defence-tech-capabilities-at-aero-india-2025",
    title: "Paras Defence Invests in Logic Fruit Technologies to Boost Defence Tech Capabilities at AERO India 2025",
    tag: "Strategic Investment",
    date: "February 12, 2025",
    location: "Bengaluru, India",
    heroFilename: "hero-PR-thumbnai.jpg",
    metaTitle: "Paras Defence Invests in Logic Fruit Technologies | Aero India 2025",
    metaDescription: "Paras Defence and Space Technologies announces strategic investment in Logic Fruit Technologies to scale sovereign defense electronics, radar DSP, and aerospace compute solutions.",
    metaKeywords: "Paras Defence, Investment, Aero India 2025, Defence Electronics, Sovereign Technology, Radar DSP, Aerospace, Logic Fruit Technologies",
    canonicalUrl: "/news/paras-defence-invests-in-logic-fruit-technologies-to-boost-defence-tech-capabilities-at-aero-india-2025",
    noIndex: false,
  },
  {
    order: 6,
    slug: "logic-fruit-announces-strategic-partnership-with-pace-at-aero-india-2025",
    title: "Logic Fruit Announces Strategic Partnership with PACE at Aero India 2025",
    tag: "Strategic Partnership",
    date: "February 11, 2025",
    location: "Bengaluru, India",
    heroFilename: "hero-Strategic-4.jpg",
    metaTitle: "Strategic Partnership with PACE at Aero India 2025 | Logic Fruit",
    metaDescription: "Logic Fruit Technologies and PACE establish strategic partnership to collaborate on aerospace flight test instrumentation, telemetry, and high-reliability defense systems.",
    metaKeywords: "PACE, Aero India 2025, Strategic Partnership, Aerospace Telemetry, Flight Test Instrumentation, Defense Engineering, Logic Fruit",
    canonicalUrl: "/news/logic-fruit-announces-strategic-partnership-with-pace-at-aero-india-2025",
    noIndex: false,
  },
  {
    order: 7,
    slug: "logic-fruit-technologies-recognized-as-a-select-200-company-at-forbes-india-dgems-2024",
    title: "Logic Fruit Technologies Recognized as a Select 200 Company at Forbes India-DGEMS 2024",
    tag: "Awards & Recognition",
    date: "December 15, 2024",
    location: "Mumbai, India",
    heroFilename: "hero-1200-x-630-1.jpg",
    metaTitle: "Logic Fruit Recognized in Forbes India Select 200 DGEMS 2024",
    metaDescription: "Forbes India selects Logic Fruit Technologies among DGEMS Select 200 companies, honoring exceptional growth and deep-tech innovation in high-speed hardware and embedded systems.",
    metaKeywords: "Forbes India, DGEMS 2024, Select 200, Deep Tech Innovation, Business Growth, Awards, Logic Fruit Technologies",
    canonicalUrl: "/news/logic-fruit-technologies-recognized-as-a-select-200-company-at-forbes-india-dgems-2024",
    noIndex: false,
  },
];

function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".gif") return "image/gif";
  return "image/jpeg";
}

/**
 * Step 1: Upload all 13 news images to S3 and mirror locally
 */
async function uploadNewsImagesToS3(s3Client) {
  console.log("==================================================");
  console.log("Step 1: Uploading News Images to AWS S3");
  console.log("Target S3 Bucket:", S3_BUCKET);
  console.log("==================================================");

  let totalUploaded = 0;
  let totalErrors = 0;

  for (const newsDef of NEWS_DEFINITIONS) {
    const slug = newsDef.slug;
    const newsImgDir = path.join(NEWS_SOURCE_DIR, slug, "images");
    const localTargetDir = path.join(LOCAL_UPLOADS_DIR, slug);

    if (!fs.existsSync(newsImgDir)) {
      console.warn(`[WARN] Directory not found: ${newsImgDir}`);
      continue;
    }

    await fs.promises.mkdir(localTargetDir, { recursive: true });

    const files = await fs.promises.readdir(newsImgDir);
    const imageFiles = files.filter((f) => /\.(jpe?g|png|webp|svg)$/i.test(f));

    console.log(`\nNews: "${slug}" (${imageFiles.length} images)`);

    for (const file of imageFiles) {
      const srcPath = path.join(newsImgDir, file);
      const destLocalPath = path.join(localTargetDir, file);
      const s3Key = `news/${slug}/${file}`;
      const contentType = getMimeType(file);

      const fileBuffer = await fs.promises.readFile(srcPath);

      // Mirror locally
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
        totalUploaded++;
        console.log(`  [S3 OK] ${s3Key} (${fileBuffer.length} bytes)`);
      } catch (err) {
        totalErrors++;
        console.error(`  [S3 FAIL] ${s3Key}:`, err.message);
      }
    }
  }

  console.log("\n--------------------------------------------------");
  console.log(`News Image Upload Summary: ${totalUploaded} uploaded to S3, ${totalErrors} errors.`);
  console.log("--------------------------------------------------");
}

/**
 * Step 2: Enriches each news article with SEO and stores in DynamoDB
 */
async function migrateNewsToDynamo(docClient) {
  console.log("\n==================================================");
  console.log("Step 2: Migrating 7 News Articles to AWS DynamoDB");
  console.log("Target Table:", TABLE_NAME);
  console.log("==================================================");

  const now = new Date().toISOString();
  const enrichedNews = [];

  for (const newsDef of NEWS_DEFINITIONS) {
    const slug = newsDef.slug;
    const newsFolder = path.join(NEWS_SOURCE_DIR, slug);
    const mdPath = path.join(newsFolder, "index.md");
    const jsonPath = path.join(newsFolder, "page.json");

    let rawMd = "";
    if (fs.existsSync(mdPath)) {
      rawMd = await fs.promises.readFile(mdPath, "utf8");
    }

    let pageData = {};
    if (fs.existsSync(jsonPath)) {
      try {
        pageData = JSON.parse(await fs.promises.readFile(jsonPath, "utf8"));
      } catch (e) {
        console.warn(`Could not parse page.json for ${slug}`);
      }
    }

    // Clean excerpt
    let excerpt = pageData.summary || "";
    excerpt = excerpt.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
    if (!excerpt && rawMd) {
      const firstPara = rawMd.split("\n\n").find((p) => p && !p.startsWith("#") && !p.startsWith(">") && !p.startsWith("!"));
      if (firstPara) {
        excerpt = firstPara.replace(/[#*`_\[\]]/g, "").trim().slice(0, 220) + "...";
      }
    }

    // Hero image streaming URL
    const heroFilename = newsDef.heroFilename;
    const heroImageUrl = `http://localhost:5000/api/upload/media/news/${slug}/${heroFilename}`;

    let contentMarkdown = rawMd.replace(
      /(src=["']|\()images\/([^"'\)]+)(["'\)])/g,
      `$1http://localhost:5000/api/upload/media/news/${slug}/$2$3`
    );

    if (slug.includes("l-qntx")) {
      contentMarkdown = contentMarkdown
        .replace(/L-QNTXT\b/g, "L-QNTX™")
        .replace(/L-QNTX(?!™)/g, "L-QNTX™")
        .replace(/L-QNTX™-PCIe-HSM/g, "L-QNTX-PCIe-HSM")
        .replace(/Crypto-Agile PCIe HSM Mockup/gi, "Crypto-Agile PCIe HSM Product View")
        .replace(/\bMockup\b/g, "Product View");
      excerpt = excerpt
        .replace(/L-QNTXT\b/g, "L-QNTX™")
        .replace(/L-QNTX(?!™)/g, "L-QNTX™");
    }

    const newsId = `news-${slug}`;

    const newsItem = {
      id: newsId,
      _id: newsId,
      slug: slug,
      title: newsDef.title,
      tag: newsDef.tag,
      date: newsDef.date,
      location: newsDef.location,
      heroImage: heroImageUrl,
      thumb: heroImageUrl,
      excerpt: excerpt,
      contentMarkdown: contentMarkdown,
      externalUrl: pageData.url || "",
      status: "published",
      entityType: "news",
      order: newsDef.order,
      metaTitle: newsDef.metaTitle,
      metaDescription: newsDef.metaDescription,
      metaKeywords: newsDef.metaKeywords,
      canonicalUrl: newsDef.canonicalUrl,
      ogImage: heroImageUrl,
      noIndex: newsDef.noIndex,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: newsItem,
        })
      );
      console.log(`[DynamoDB News OK] Order ${newsItem.order}: "${newsItem.title}" (${slug})`);
      enrichedNews.push(newsItem);
    } catch (err) {
      console.error(`[DynamoDB News FAIL] ${slug}:`, err.message);
      enrichedNews.push(newsItem);
    }
  }

  return enrichedNews;
}

/**
 * Step 3: Write enriched news to local JSON backup files
 */
async function syncLocalBackups(news) {
  console.log("\n==================================================");
  console.log("Step 3: Synchronizing Local JSON Backup Files");
  console.log("==================================================");

  // 1. Write news.json
  await fs.promises.mkdir(path.dirname(NEWS_BACKUP_FILE), { recursive: true });
  await fs.promises.writeFile(NEWS_BACKUP_FILE, JSON.stringify(news, null, 2), "utf8");
  console.log(`[Sync OK] Written ${news.length} news items to: ${NEWS_BACKUP_FILE}`);

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

  // Remove existing news entities
  localDb = localDb.filter((item) => item.entityType !== "news");

  // Add the newly migrated news
  localDb.push(...news);

  await fs.promises.writeFile(LOCAL_DB_FILE, JSON.stringify(localDb, null, 2), "utf8");
  console.log(`[Sync OK] Synced ${news.length} news items to ${LOCAL_DB_FILE}`);
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

  // 1. Upload images
  await uploadNewsImagesToS3(s3Client);

  // 2. Migrate news articles
  const news = await migrateNewsToDynamo(docClient);

  // 3. Save local backup files
  await syncLocalBackups(news);

  console.log("\n==================================================");
  console.log("ALL NEWS MIGRATION STEPS COMPLETED SUCCESSFULLY!");
  console.log("==================================================");
}

run().catch((err) => {
  console.error("Fatal news migration error:", err);
  process.exit(1);
});
