import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { PutCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

import { getDocClient, TABLE_NAME } from "../src/config/dynamo.js";
import { dynamoService } from "../src/services/dynamoService.js";

const S3_BUCKET = process.env.AWS_S3_BUCKET_NAME || "logicfruit-cms-assets-833823555826";
const AWS_REGION = process.env.AWS_REGION || "ap-south-1";
const BASE_URL = process.env.BASE_URL || "https://api.logic-fruit.com";

const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const SLUG = "logic-fruit-technologies-unveils-l-nex-a-reconfigurable-bmc-platform-for-next-generation-ai-and-datacenter-infrastructure";

const DEPLOY_DIR = path.join(__dirname, "../deploy");
const BACKEND_UPLOADS_DIR = path.join(__dirname, "../uploads/news", SLUG);
const FRONTEND_ASSETS_DIR = path.join(__dirname, "../../logic-fruit-ui/src/assets/img/news-data/news", SLUG);
const FRONTEND_IMAGES_DIR = path.join(FRONTEND_ASSETS_DIR, "images");

const imagesToProcess = [
  {
    src: path.join(DEPLOY_DIR, "image2.png"),
    filename: "hero-l-nex-reconfigurable-bmc-platform.png",
    isHero: true,
  },
  {
    src: path.join(DEPLOY_DIR, "image1.png"),
    filename: "L-Nex-DC-SCM-BMC-Module-Product-View.png",
    isHero: false,
  },
  {
    src: path.join(DEPLOY_DIR, "image3.png"),
    filename: "L-Nex-DC-SCM-BMC-Architecture-Overview.png",
    isHero: false,
  },
];

async function main() {
  console.log("=== Step 1: Uploading Images & Setting Up Local Assets ===");

  fs.mkdirSync(BACKEND_UPLOADS_DIR, { recursive: true });
  fs.mkdirSync(FRONTEND_IMAGES_DIR, { recursive: true });

  let heroUrl = "";

  for (const item of imagesToProcess) {
    if (!fs.existsSync(item.src)) {
      console.error(`Source image missing: ${item.src}`);
      continue;
    }

    const buffer = fs.readFileSync(item.src);
    const destBackend = path.join(BACKEND_UPLOADS_DIR, item.filename);
    const destFrontend = path.join(FRONTEND_IMAGES_DIR, item.filename);

    fs.copyFileSync(item.src, destBackend);
    fs.copyFileSync(item.src, destFrontend);
    console.log(`Copied locally: ${item.filename}`);

    const s3Key = `news/${SLUG}/${item.filename}`;
    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: s3Key,
          Body: buffer,
          ContentType: "image/png",
          CacheControl: "public, max-age=31536000, immutable",
        })
      );
      console.log(`[S3 OK] s3://${S3_BUCKET}/${s3Key}`);
    } catch (err) {
      console.warn(`[S3 WARN] Upload to S3 failed: ${err.message}`);
    }

    const publicUrl = `${BASE_URL}/api/upload/media/news/${SLUG}/${item.filename}`;
    if (item.isHero) {
      heroUrl = publicUrl;
    }
  }

  console.log("Hero Image URL:", heroUrl);

  const heroImgUrl = `${BASE_URL}/api/upload/media/news/${SLUG}/hero-l-nex-reconfigurable-bmc-platform.png`;
  const productViewUrl = `${BASE_URL}/api/upload/media/news/${SLUG}/L-Nex-DC-SCM-BMC-Module-Product-View.png`;
  const archViewUrl = `${BASE_URL}/api/upload/media/news/${SLUG}/L-Nex-DC-SCM-BMC-Architecture-Overview.png`;

  const contentMarkdown = `# Logic Fruit Technologies Unveils L-Nex™, a Reconfigurable BMC Platform for Next-Generation AI and Datacenter Infrastructure

> **Source:** https://www.logic-fruit.com/news/${SLUG}/  
> **Category:** news  
> **Summary:** Reconfigurable FPGA-based OCP DC-SCM 2.x platform combines OpenBMC, hardware-rooted security and programmable management logic, enabling server manufacturers and infrastructure customers to configure selected capabilities during design-in and evolve them after deployment.

![Logic Fruit Technologies Unveils L-Nex™](${heroImgUrl})

*Featured image (hero)*

---

**GURUGRAM, India — October 6, 2026** — Logic Fruit Technologies, a deep-tech semiconductor product company headquartered in India and serving customers worldwide, today announced **L-Nex™**, a new family of FPGA-based Baseboard Management Controller (BMC) products being developed for next-generation AI, cloud, datacenter, sovereign and other high-performance computing infrastructure.

L-Nex™ is designed around the Open Compute Project (OCP) DC-SCM 2.x architecture and combines the management processor, host interfaces, remote KVM, telemetry and hardware root-of-trust functions within a reconfigurable FPGA SoC. The platform runs OpenBMC and is designed to support industry-standard management and security interfaces including Redfish, IPMI, PLDM/MCTP and SPDM.

The core idea: move server management from a largely fixed-function silicon model to a configurable platform. Unlike BMC architectures in which key hardware management functions are fixed at silicon manufacture, L-Nex™ is being developed so selected customer and platform requirements can be configured during system design and subsequently evolved through authenticated software and FPGA bitstream updates as security standards, protocols and infrastructure requirements change.

![L-Nex™ DC-SCM 2.x BMC Module Product View](${productViewUrl})

## Built for a Rapidly Changing AI Infrastructure Market

The rapid deployment of increasingly powerful GPU and accelerator-based servers is placing new demands on server management, telemetry, power and thermal control, security and lifecycle management. At the same time, server platforms can remain deployed for many years while security standards, cryptographic requirements and management protocols continue to evolve.

L-Nex™ is intended to address this mismatch by implementing selected management, interface and security functions in programmable hardware rather than fixing those functions at BMC silicon manufacture. This creates a controlled path for qualified customers to implement platform-specific telemetry, security and management capabilities without requiring development of a new BMC ASIC.

> *“AI and datacenter infrastructure is evolving at extraordinary speed, but many of the critical control functions inside a server are still defined by fixed-function silicon. With L-Nex™, we want to change that model. We are building a reconfigurable management platform that customers can help shape for their next-generation systems and that can continue evolving after those systems are deployed. Together with L-QNTX™, L-Nex™ reflects our broader strategy of building core semiconductor, security and infrastructure technologies in India for global markets. By introducing L-Nex™ during its development cycle, we also want to engage with leading server, AI-infrastructure and technology companies while their future platforms are still being architected.”*  
> **— Sunil Kar, President and CEO, Logic Fruit Technologies**

## One Management Architecture — Configure, Deploy, Evolve, Extend

- **Configure during design:** Server OEMs, ODMs and strategic infrastructure customers can engage with Logic Fruit on platform-specific interfaces, telemetry, security functions, management extensions and other requirements within a controlled common architecture.
- **Deploy on an open, standardized platform:** L-Nex™ combines OCP DC-SCM/DC-SCI architecture with OpenBMC and standard DMTF management and security interfaces, enabling integration into next-generation server platforms.
- **Evolve throughout the lifecycle:** Reconfigurable FPGA fabric enables selected management, interface and security functions to be updated as requirements change, rather than requiring a new silicon generation.
- **Extend for qualified customer requirements:** Logic Fruit intends to maintain a common L-Nex™ platform while supporting controlled customer extensions. Customers can also access software source and, under appropriate licensing arrangements, Logic Fruit FPGA fabric IP and reserved fabric capacity for specialized requirements.

![L-Nex™ DC-SCM BMC Architecture Overview](${archViewUrl})

## Hardware-Rooted Security and Cryptographic Agility

Security is a core element of the L-Nex™ architecture. The product family is being designed with secure boot, hardware root-of-trust capabilities, firmware authentication and rollback protection, attestation and platform firmware resiliency aligned with NIST SP 800-193. The reconfigurable architecture is also intended to provide a path for cryptographic evolution, including migration toward post-quantum cryptographic algorithms, without requiring replacement of the entire management architecture as security requirements change.

## Host-Independent Telemetry and Analytics at the Management Layer

Logic Fruit is also developing on-module telemetry and analytics capabilities for L-Nex™, including thermal-anomaly detection, fan-failure prediction and power-trend analysis. These capabilities are intended to operate independently of the host CPU and complement conventional server management functions. These telemetry and analytics capabilities are planned for early-access introduction, with performance, accuracy and false-alarm characteristics to be published as evaluation evidence becomes available.

## A Multi-Silicon Product Architecture

Rather than being tied permanently to a single BMC silicon implementation, the L-Nex™ architecture is intended to support multiple FPGA SoC families over successive product generations. Logic Fruit plans to maintain common software, management interfaces and core platform architecture across supported devices while developing and validating the appropriate BSP, security implementation and FPGA fabric for each silicon family. This common-architecture, silicon-specific implementation model is intended to provide customers with greater architectural flexibility and reduce dependence on a single merchant BMC silicon source.

## Complementary to Logic Fruit's L-QNTX™ Security Platform

L-Nex™ complements Logic Fruit's recently announced L-QNTX™ crypto-agile security platform. L-QNTX spans licensable cryptographic Soft IP, embedded hardware root of trust, PCIe security platforms and network-attached Hardware Security Modules (HSMs), while L-Nex™ addresses the management and control layer of server infrastructure. Together, the product families reflect Logic Fruit's strategy of developing reconfigurable semiconductor, security and infrastructure platforms that can evolve as computing architectures, management requirements and security standards change. The two families are complementary product platforms; specific shared technology and product integration will follow their respective development and validation roadmaps.

## India-Engineered Deep Technology for Global Infrastructure

L-Nex™ represents a significant expansion of Logic Fruit's strategy of translating its semiconductor and systems-engineering capabilities into proprietary product platforms, software and licensable IP for global infrastructure markets. The L-Nex™ module architecture, board design, FPGA fabric RTL, firmware, OpenBMC integration and a substantial portion of product validation are being led by Logic Fruit's India-based engineering organization. The platform is being designed from inception for international datacenter standards and global customers.

## L-Nex™ Early Evaluation and Design Partner Program

L-Nex™ is an early product family currently under development. Logic Fruit Technologies is engaging OEMs, ODMs, infrastructure operators and technology partners for evaluation, platform configuration and design-in ahead of targeted production readiness in Q3 2027. The family is planned to include the L-Nex™ BMC727, BMC628 and BMC928 hardware platforms and the L-Nex™ BMC SW27 software platform. Additional FPGA SoC implementations are planned as the product family expands.

Qualified OEMs, ODMs, infrastructure operators, silicon partners and technology companies interested in detailed architecture briefings, evaluation planning, platform-specific design discussions or ecosystem collaboration can contact [info@logic-fruit.com](mailto:info@logic-fruit.com) or visit [www.logic-fruit.com](https://www.logic-fruit.com).

## About Logic Fruit Technologies

Logic Fruit Technologies is a deep-tech semiconductor product company headquartered in India and serving customers worldwide. The company's engineering capabilities span FPGA and ASIC design, AI/ML hardware and software systems, high-speed interface IP, mission-critical defense systems, and FPGA-based hardware platforms. Logic Fruit serves customers across AI and datacenter infrastructure, aerospace and defense, communications, industrial systems and robotics market segments. With L-Nex™, the company is extending these capabilities into reconfigurable server management, security and datacenter infrastructure.

### Media, Partnership, and Evaluation Inquiries

**Jaswant Singh**  
Head – Digital Marketing  
Logic Fruit Technologies  
Email: [jaswant.singh@logic-fruit.com](mailto:jaswant.singh@logic-fruit.com) | [info@logic-fruit.com](mailto:info@logic-fruit.com)  
Website: [www.logic-fruit.com](https://www.logic-fruit.com)
`;

  // Write static index.md and page.json in frontend
  fs.writeFileSync(path.join(FRONTEND_ASSETS_DIR, "index.md"), contentMarkdown, "utf8");
  const pageJsonData = {
    title: "Logic Fruit Technologies Unveils L-Nex™, a Reconfigurable BMC Platform for Next-Generation AI and Datacenter Infrastructure",
    date: "October 06, 2026",
    location: "GURUGRAM, India",
    category: "news",
    summary: "Reconfigurable FPGA-based OCP DC-SCM 2.x platform combines OpenBMC, hardware-rooted security and programmable management logic, enabling server manufacturers and infrastructure customers to configure selected capabilities during design-in and evolve them after deployment.",
    url: `https://www.logic-fruit.com/news/${SLUG}/`,
    images: imagesToProcess.map((i) => `images/${i.filename}`),
  };
  fs.writeFileSync(path.join(FRONTEND_ASSETS_DIR, "page.json"), JSON.stringify(pageJsonData, null, 2), "utf8");
  console.log("Wrote static assets (index.md, page.json)");

  console.log("\n=== Step 2: Updating DynamoDB News Ordering ===");
  const docClient = getDocClient();
  const allNews = await dynamoService.getAll("news", { status: "all" });

  // Shift existing news orders so L-Nex can take order 0 (first in list)
  for (const n of allNews) {
    if (n.slug !== SLUG && typeof n.order === "number") {
      const newOrder = n.order + 1;
      await dynamoService.update(n.id || n._id, { order: newOrder });
      console.log(`Shifted news "${n.title?.slice(0, 30)}..." order to ${newOrder}`);
    }
  }

  console.log("\n=== Step 3: Upserting L-Nex Press Release into DynamoDB ===");
  const now = new Date().toISOString();
  const newsItemData = {
    title: "Logic Fruit Technologies Unveils L-Nex™, a Reconfigurable BMC Platform for Next-Generation AI and Datacenter Infrastructure",
    slug: SLUG,
    tag: "Product Announcement",
    date: "October 06, 2026",
    location: "GURUGRAM, India",
    heroImage: heroImgUrl,
    thumb: heroImgUrl,
    excerpt: "Reconfigurable FPGA-based OCP DC-SCM 2.x platform combines OpenBMC, hardware-rooted security and programmable management logic, enabling server manufacturers and infrastructure customers to configure selected capabilities during design-in and evolve them after deployment.",
    contentMarkdown: contentMarkdown,
    externalUrl: `https://www.logic-fruit.com/news/${SLUG}/`,
    status: "published",
    isProduction: false, // STAGING ONLY as requested!
    order: 0, // First in list
    metaTitle: "Logic Fruit Unveils L-Nex™ Reconfigurable BMC Platform | Press Release",
    metaDescription: "Logic Fruit Technologies announces L-Nex™, a reconfigurable FPGA-based OCP DC-SCM 2.x BMC platform with OpenBMC, hardware root of trust, and PQC security.",
    metaKeywords: "L-Nex™, Baseboard Management Controller, BMC, OCP DC-SCM, OpenBMC, FPGA BMC, Datacenter Infrastructure, AI Servers, Logic Fruit Technologies, Sunil Kar",
    canonicalUrl: `/news/${SLUG}`,
    ogImage: heroImgUrl,
    noIndex: true, // While in staging
    createdAt: now,
    updatedAt: now,
  };

  const existing = await dynamoService.getBySlug(SLUG);
  if (existing) {
    const existingId = existing.id || existing._id;
    console.log(`News already exists with ID: ${existingId}. Updating...`);
    const updated = await dynamoService.update(existingId, newsItemData);
    console.log("Updated news entry in DynamoDB successfully!");
  } else {
    console.log("Creating new entry in DynamoDB...");
    const created = await dynamoService.create("news", newsItemData);
    console.log("Created news entry in DynamoDB successfully!");
  }

  // Also update data/news.json local mirror
  const newsJsonPath = path.join(__dirname, "../data/news.json");
  if (fs.existsSync(newsJsonPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(newsJsonPath, "utf8"));
      const filtered = data.filter((item) => item.slug !== SLUG);
      filtered.unshift({
        id: `news-${SLUG}`,
        _id: `news-${SLUG}`,
        entityType: "news",
        ...newsItemData,
      });
      fs.writeFileSync(newsJsonPath, JSON.stringify(filtered, null, 2), "utf8");
      console.log("Updated backend/data/news.json local backup file!");
    } catch (e) {
      console.warn("Could not update news.json:", e.message);
    }
  }

  console.log("\n=== DONE: L-Nex Press Release is published in Staging Only! ===");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
