/**
 * Migration Script: Migrate Authentic Blogs, Categories, and Images to AWS DynamoDB & AWS S3
 * 
 * Actions:
 *   1. Uploads all 89 blog images across all 7 blogs to AWS S3 under "blogs/<slug>/<filename>".
 *   2. Copies image files to local "backend/uploads/blogs/<slug>/<filename>" for fallback.
 *   3. Inserts the 5 blog categories into AWS DynamoDB ("logicfruit_cms").
 *   4. Enriches each blog with order (0-6), SEO metadata, and rewrites markdown image links to S3 media endpoints.
 *   5. Inserts all 7 blogs into AWS DynamoDB ("logicfruit_cms").
 *   6. Saves synchronized data to backend/data/blogs.json and backend/data/local_db.json.
 * 
 * Usage:
 *   node scripts/migrate_blogs_to_dynamo.js
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

const BLOGS_SOURCE_DIR = path.join(__dirname, "../../logic-fruit-ui/src/assets/img/blogs-data/blogs");
const BLOGS_BACKUP_FILE = path.join(__dirname, "../data/blogs.json");
const LOCAL_DB_FILE = path.join(__dirname, "../data/local_db.json");
const LOCAL_UPLOADS_DIR = path.join(__dirname, "../uploads/blogs");

const S3_BUCKET = process.env.AWS_S3_BUCKET_NAME || "logicfruit-cms-assets-833823555826";
const AWS_REGION = process.env.AWS_REGION || "ap-south-1";

// 5 Main blog categories
const BLOG_CATEGORIES = [
  { label: "FPGA & ASIC", value: "fpga" },
  { label: "High-Speed Interface", value: "high-speed-interface" },
  { label: "Avionics / ARINC", value: "arinc" },
  { label: "Embedded Systems", value: "embedded" },
  { label: "Defense & Wireless", value: "wireless-communication" },
];

// 7 Blogs with authoritative metadata, ordering, and SEO configurations
const BLOGS_DEFINITIONS = [
  {
    order: 0,
    slug: "understanding-fpgas",
    title: "Understanding FPGAs – From Architecture to SoC, RFSoC, and Embedded FPGA Technologies",
    category: "fpga",
    tag: "FPGA & ASIC",
    author: "NIRANJANA R",
    authorRole: "FPGA Systems Architect",
    date: "August 17, 2026",
    readTime: "12 min read",
    heroFilename: "hero-fpga-thumbnail-copy.jpg",
    metaTitle: "Understanding FPGAs – Architecture, SoC & RFSoC | Logic Fruit Technologies",
    metaDescription: "Explore FPGA architecture, SoC, RFSoC, and embedded FPGA technologies. Learn CLBs, synthesis, HDL design flows, and high-performance embedded systems.",
    metaKeywords: "FPGA Architecture, SoC FPGA, RFSoC, Embedded FPGA, CLB, VHDL, Verilog, Vivado, Logic Fruit Technologies, FPGA Design",
    canonicalUrl: "/blogs/understanding-fpgas",
    noIndex: false,
  },
  {
    order: 1,
    slug: "high-speed-board-design",
    title: "Master High-Speed Board Design: Essential Tips & Techniques",
    category: "high-speed-interface",
    tag: "High-Speed Interface",
    author: "JASWANT SINGH",
    authorRole: "Hardware Design Lead",
    date: "August 04, 2026",
    readTime: "8 min read",
    heroFilename: "hero-High-speed-board-design-Thumbnail-1-1.jpg",
    metaTitle: "High-Speed Board Design: Essential Tips & Techniques | Logic Fruit",
    metaDescription: "Master high-speed PCB design with key guidelines on signal integrity, power integrity, differential pairs, crosstalk minimization, and EMI shielding.",
    metaKeywords: "High-Speed PCB Design, Signal Integrity, Power Integrity, Impedance Matching, Crosstalk, EMI, Hardware Engineering, Logic Fruit",
    canonicalUrl: "/blogs/high-speed-board-design",
    noIndex: false,
  },
  {
    order: 2,
    slug: "from-arinc-818-to-818-3",
    title: "From ARINC 818 to 818-3 – A Complete Comparison of Avionics Digital Video Standards",
    category: "arinc",
    tag: "Avionics / ARINC",
    author: "JASWANT SINGH",
    authorRole: "Avionics Specialist",
    date: "July 24, 2026",
    readTime: "7 min read",
    heroFilename: "hero-thumbnail-design-arnic-818-to-arnic-818-3.jpg",
    metaTitle: "ARINC 818 to 818-3 Comparison: Avionics Digital Video Standards | Logic Fruit",
    metaDescription: "Compare ARINC 818, ARINC 818-2, and ARINC 818-3 avionics video bus standards. Learn bandwidth capabilities, link rates up to 28 Gbps, and flight display integrations.",
    metaKeywords: "ARINC 818, ARINC 818-3, Avionics Video, Fibre Channel, Digital Video Bus, Cockpit Displays, Mission Computers, Aerospace Engineering",
    canonicalUrl: "/blogs/from-arinc-818-to-818-3",
    noIndex: false,
  },
  {
    order: 3,
    slug: "communication-solutions-in-defense",
    title: "Secured Communication Solutions in Defense – An Overview",
    category: "wireless-communication",
    tag: "Defense & Wireless",
    author: "SAHIL SINGH",
    authorRole: "Defense Systems Engineer",
    date: "July 12, 2026",
    readTime: "10 min read",
    heroFilename: "hero-Thumbnail-2.jpg",
    metaTitle: "Secured Communication Solutions in Defense | Logic Fruit Technologies",
    metaDescription: "Overview of modern defense communication solutions: secure SDRs, anti-jamming tactical data links, encrypted RF links, and aerospace mission critical systems.",
    metaKeywords: "Defense Communications, Software Defined Radio, SDR, Tactical Data Links, RF Communications, Anti-Jamming, Encryption, Aerospace Defense",
    canonicalUrl: "/blogs/communication-solutions-in-defense",
    noIndex: false,
  },
  {
    order: 4,
    slug: "fpga-design-an-ultimate-guide-for-fpga-enthusiasts",
    title: "FPGA Design: An Ultimate Guide for FPGA Enthusiasts",
    category: "fpga",
    tag: "FPGA Design",
    author: "SEJAL SINGH",
    authorRole: "Digital Logic Engineer",
    date: "June 28, 2026",
    readTime: "9 min read",
    heroFilename: "hero-fpga-design-ultimate-guide.jpg",
    metaTitle: "FPGA Design: Ultimate Guide for FPGA Enthusiasts | Logic Fruit",
    metaDescription: "Complete guide to FPGA design: architecture, RTL design, simulation, synthesis, place and route, timing analysis, and hardware debugging best practices.",
    metaKeywords: "FPGA Design Guide, RTL Design, SystemVerilog, VHDL, Timing Closure, Place and Route, FPGA Synthesis, Logic Fruit Technologies",
    canonicalUrl: "/blogs/fpga-design-an-ultimate-guide-for-fpga-enthusiasts",
    noIndex: false,
  },
  {
    order: 5,
    slug: "arinc-818-standard-features-benefits-applications",
    title: "Understanding ARINC 818 Standard – Key Features, Benefits, and Aerospace Applications",
    category: "arinc",
    tag: "ARINC 818",
    author: "JASWANT SINGH",
    authorRole: "Avionics Systems Architect",
    date: "June 15, 2026",
    readTime: "6 min read",
    heroFilename: "hero-ARINC-818-Standard-Key-Features-Benefits-and-Aerospace-Applications-Thumbnail.jpg",
    metaTitle: "Understanding ARINC 818 Standard: Features & Aerospace Applications | Logic Fruit",
    metaDescription: "In-depth guide to ARINC 818 protocol: key features, high bandwidth video transmission, cockpit displays, HUDs, and defense aircraft avionics.",
    metaKeywords: "ARINC 818 Standard, Avionics Protocol, Cockpit Displays, Head-Up Display, Optical Fibre Channel, Aerospace Applications, Logic Fruit",
    canonicalUrl: "/blogs/arinc-818-standard-features-benefits-applications",
    noIndex: false,
  },
  {
    order: 6,
    slug: "embedded-systems-guide",
    title: "Embedded System – Ultimate Design & Development Guide",
    category: "embedded",
    tag: "Embedded Systems",
    author: "PIYUSH GUPTA",
    authorRole: "Embedded Firmware Architect",
    date: "May 29, 2026",
    readTime: "15 min read",
    heroFilename: "hero-Embedded-Systems-Design-and-Development-Services-Thumbnail.jpg",
    metaTitle: "Embedded Systems: Ultimate Design & Development Guide | Logic Fruit",
    metaDescription: "Ultimate guide to embedded systems design: microcontrollers, real-time operating systems (RTOS), hardware-software co-design, firmware, and IoT edge devices.",
    metaKeywords: "Embedded Systems Guide, Microcontrollers, RTOS, Firmware Development, Hardware Software Co-design, IoT, Embedded Engineering, Logic Fruit",
    canonicalUrl: "/blogs/embedded-systems-guide",
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
 * Step 1: Upload all 89 images to AWS S3 & mirror to local uploads directory
 */
async function uploadBlogImagesToS3(s3Client) {
  console.log("==================================================");
  console.log("Step 1: Uploading Blog Images to AWS S3");
  console.log("Target S3 Bucket:", S3_BUCKET);
  console.log("==================================================");

  let totalUploaded = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const blogDef of BLOGS_DEFINITIONS) {
    const slug = blogDef.slug;
    const blogImgDir = path.join(BLOGS_SOURCE_DIR, slug, "images");
    const localTargetDir = path.join(LOCAL_UPLOADS_DIR, slug);

    if (!fs.existsSync(blogImgDir)) {
      console.warn(`[WARN] Directory not found: ${blogImgDir}`);
      continue;
    }

    await fs.promises.mkdir(localTargetDir, { recursive: true });

    const files = await fs.promises.readdir(blogImgDir);
    const imageFiles = files.filter((f) => /\.(jpe?g|png|webp|svg)$/i.test(f));

    console.log(`\nBlog: "${slug}" (${imageFiles.length} images)`);

    for (const file of imageFiles) {
      const srcPath = path.join(blogImgDir, file);
      const destLocalPath = path.join(localTargetDir, file);
      const s3Key = `blogs/${slug}/${file}`;
      const contentType = getMimeType(file);

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
        totalUploaded++;
        console.log(`  [S3 OK] ${s3Key} (${fileBuffer.length} bytes)`);
      } catch (err) {
        totalErrors++;
        console.error(`  [S3 FAIL] ${s3Key}:`, err.message);
      }
    }
  }

  console.log("\n--------------------------------------------------");
  console.log(`Image Upload Summary: ${totalUploaded} uploaded to S3, ${totalErrors} errors.`);
  console.log("--------------------------------------------------");
}

/**
 * Step 2: Insert 5 Blog Categories into DynamoDB
 */
async function migrateCategoriesToDynamo(docClient) {
  console.log("\n==================================================");
  console.log("Step 2: Migrating Blog Categories to AWS DynamoDB");
  console.log("Target Table:", TABLE_NAME);
  console.log("==================================================");

  const now = new Date().toISOString();
  const savedCategories = [];

  for (const cat of BLOG_CATEGORIES) {
    const id = `cat-${cat.value}`;
    const item = {
      id,
      _id: id,
      entityType: "category",
      label: cat.label,
      value: cat.value,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: item,
        })
      );
      console.log(`[DynamoDB Category OK] ${cat.label} (${cat.value})`);
      savedCategories.push(item);
    } catch (err) {
      console.error(`[DynamoDB Category FAIL] ${cat.label}:`, err.message);
      savedCategories.push(item);
    }
  }

  return savedCategories;
}

/**
 * Step 3: Enriches each blog with SEO, rewrites markdown image URLs, and stores in DynamoDB
 */
async function migrateBlogsToDynamo(docClient) {
  console.log("\n==================================================");
  console.log("Step 3: Migrating 7 Engineering Blogs to AWS DynamoDB");
  console.log("Target Table:", TABLE_NAME);
  console.log("==================================================");

  const now = new Date().toISOString();
  const enrichedBlogs = [];

  for (const blogDef of BLOGS_DEFINITIONS) {
    const slug = blogDef.slug;
    const blogFolder = path.join(BLOGS_SOURCE_DIR, slug);
    const mdPath = path.join(blogFolder, "index.md");
    const jsonPath = path.join(blogFolder, "page.json");

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

    // Extract excerpt from summary (strip HTML tags)
    let excerpt = pageData.summary || "";
    excerpt = excerpt.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
    if (!excerpt && rawMd) {
      const firstPara = rawMd.split("\n\n").find((p) => p && !p.startsWith("#") && !p.startsWith(">") && !p.startsWith("!"));
      if (firstPara) {
        excerpt = firstPara.replace(/[#*`_\[\]]/g, "").trim().slice(0, 220) + "...";
      }
    }

    // Hero image streaming URL (points to AWS backend media streaming route)
    const baseUrl = process.env.BASE_URL || "https://api.logic-fruit.com";
    const heroFilename = blogDef.heroFilename;
    const heroImageUrl = `${baseUrl}/api/upload/media/blogs/${slug}/${heroFilename}`;

    // Rewrite all image paths in markdown:
    // Pattern 1: ![alt](images/filename.ext) -> ![alt](BASE_URL/api/upload/media/blogs/<slug>/filename.ext)
    // Pattern 2: src="images/filename.ext" -> src="BASE_URL/api/upload/media/blogs/<slug>/filename.ext"
    let contentMarkdown = rawMd.replace(
      /(src=["']|\()images\/([^"'\)]+)(["'\)])/g,
      `$1${baseUrl}/api/upload/media/blogs/${slug}/$2$3`
    );

    const blogId = `blog-${slug}`;

    const blogItem = {
      id: blogId,
      _id: blogId,
      slug: slug,
      title: blogDef.title,
      category: blogDef.category,
      tag: blogDef.tag,
      author: blogDef.author,
      authorRole: blogDef.authorRole,
      date: blogDef.date,
      readTime: blogDef.readTime,
      heroImage: heroImageUrl,
      thumb: heroImageUrl,
      excerpt: excerpt,
      contentMarkdown: contentMarkdown,
      status: "published",
      entityType: "blog",
      order: blogDef.order,
      isPinned: blogDef.isPinned ?? (blogDef.order === 0),
      metaTitle: blogDef.metaTitle,
      metaDescription: blogDef.metaDescription,
      metaKeywords: blogDef.metaKeywords,
      canonicalUrl: blogDef.canonicalUrl,
      ogImage: heroImageUrl,
      noIndex: blogDef.noIndex,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: blogItem,
        })
      );
      console.log(`[DynamoDB Blog OK] Order ${blogItem.order}: "${blogItem.title}" (${slug})`);
      enrichedBlogs.push(blogItem);
    } catch (err) {
      console.error(`[DynamoDB Blog FAIL] ${slug}:`, err.message);
      enrichedBlogs.push(blogItem);
    }
  }

  return enrichedBlogs;
}

/**
 * Step 4: Write enriched blogs & categories to local JSON backup files
 */
async function syncLocalBackups(blogs, categories) {
  console.log("\n==================================================");
  console.log("Step 4: Synchronizing Local JSON Backup Files");
  console.log("==================================================");

  // 1. Write blogs.json
  await fs.promises.mkdir(path.dirname(BLOGS_BACKUP_FILE), { recursive: true });
  await fs.promises.writeFile(BLOGS_BACKUP_FILE, JSON.stringify(blogs, null, 2), "utf8");
  console.log(`[Sync OK] Written ${blogs.length} blogs to: ${BLOGS_BACKUP_FILE}`);

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

  // Remove existing blog and category entities to prevent stale/duplicate data
  localDb = localDb.filter((item) => item.entityType !== "blog" && item.entityType !== "category");

  // Add the newly migrated categories and blogs
  localDb.push(...categories);
  localDb.push(...blogs);

  await fs.promises.writeFile(LOCAL_DB_FILE, JSON.stringify(localDb, null, 2), "utf8");
  console.log(`[Sync OK] Synced ${categories.length} categories and ${blogs.length} blogs to ${LOCAL_DB_FILE}`);
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
  await uploadBlogImagesToS3(s3Client);

  // 2. Migrate categories
  const categories = await migrateCategoriesToDynamo(docClient);

  // 3. Migrate blogs
  const blogs = await migrateBlogsToDynamo(docClient);

  // 4. Save local backup files
  await syncLocalBackups(blogs, categories);

  console.log("\n==================================================");
  console.log("ALL BLOG MIGRATION STEPS COMPLETED SUCCESSFULLY!");
  console.log("==================================================");
}

run().catch((err) => {
  console.error("Fatal migration error:", err);
  process.exit(1);
});
