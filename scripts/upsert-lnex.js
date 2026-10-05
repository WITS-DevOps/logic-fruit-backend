import dotenv from "dotenv";
dotenv.config();

import { dynamoService } from "../src/services/dynamoService.js";

async function upsertLnex() {
  const slug = "l-nex-dc-scm-bmc-module";
  console.log(`Checking if product '${slug}' exists in DynamoDB...`);

  const productData = {
    title: "L-Nex™ DC-SCM BMC Module",
    slug: slug,
    type: "Hardware System",
    status: "published",
    isProduction: false, // STAGING ONLY as requested by user
    isProductOfTheMonth: false,
    heroImage: "", // Image to be provided later by user
    thumbnailImage: "",
    feature:
      "A configurable, field-upgradable BMC platform for the OCP DC-SCM 2.x socket — shaped around your platform at design-in, upgradable in the field for the life of the server.",
    overviewHeadline:
      "Planning a next-generation AI, cloud, storage or sovereign server platform?",
    featuresSubtitle:
      "L-Nex™ FPGA-based OCP DC-SCM 2.x BMC module, engineered for secure, open and reconfigurable management of next-generation AI, cloud and sovereign server platforms.",
    featureBadges: ["Reconfigurable", "Open", "Customizable", "Multi-silicon"],
    featureList: [
      "Reconfigurable FPGA Fabric: Management, security and host-interface logic run in FPGA fabric, updated through authenticated bitstream releases — no BMC silicon respin.",
      "Open, Upstream OpenBMC: Upstream OpenBMC on Yocto with source-delivered BSP and drivers. Standard Redfish, IPMI 2.0, PLDM, MCTP and SPDM interfaces.",
      "Hardware Root of Trust: Silicon PUF device identity, secure and measured boot, DICE/SPDM attestation and firmware resiliency aligned with NIST SP 800-193.",
      "PQC-Ready Security: Designed for NIST post-quantum algorithms (ML-KEM, ML-DSA, SLH-DSA) for firmware and bitstream authentication, alongside RSA and ECC.",
      "OCP DC-SCM 2.x Module: Horizontal DC-SCM module with SFF-TA-1002 edge connector and DC-SCI 2.x interface, designed for OCP DC-MHS server platforms.",
      "Host Interfaces & iKVM: eSPI, PECI, PCIe Gen3 endpoint with MCTP, I2C/I3C, NC-SI and LTPI, with low-latency MJPEG iKVM and virtual media in the browser.",
      "On-Module AI Telemetry: Host-independent thermal, fan-failure and power-trend anomaly detection running at the management layer, close to the hardware.",
      "Customizable & Multi-Silicon: Platform-specific extensions configured during design-in, on a common architecture across supported FPGA SoC families.",
    ],
    faqs: [
      {
        question:
          "What exactly is the L-Nex™ BMC module — and is Logic Fruit building a BMC chip or a server?",
        answer:
          "L-Nex™ is a complete DC-SCM module: the board, a commercial FPGA SoC, secure firmware, the OpenBMC software stack and Logic Fruit FPGA fabric IP. It uses the OCP DC-SCM 2.x horizontal form factor with an SFF-TA-1002 edge connector and DC-SCI 2.x interface, and carries the management Ethernet, USB, serial console and status indicators on its faceplate.\n\nLogic Fruit does not manufacture a BMC chip, and it does not build servers or host processor modules. This is a deliberate scope decision: OEMs, ODMs and FPGA vendors can adopt L-Nex™ without it competing against their own products.",
      },
      {
        question: "How is L-Nex™ different from conventional DC-SCM modules?",
        answer:
          "Most DC-SCM modules pair a fixed-function BMC ASIC with a separate root-of-trust device and often a CPLD for glue logic. L-Nex™ consolidates BMC compute, host interfaces and root of trust into one reconfigurable FPGA SoC — fewer parts, fewer firmware images to secure, and a management controller whose interfaces and security functions can change after shipment.\n\nThe comparison is functional, not rhetorical: established BMC silicon remains a strong choice for high-volume commodity servers. L-Nex™ targets platforms where configurability, auditability, long lifecycles and supply diversity matter most.",
      },
      {
        question:
          "What is the L-Nex™ Design Partner Program, and when should we engage?",
        answer:
          "The Design Partner Program is Logic Fruit's early-engagement track for qualified OEMs, ODMs, hyperscalers, infrastructure operators and technology partners. It includes architecture briefings, evaluation planning and joint requirements and configuration work for the partner's platform.\n\nThe best time to engage is during architecture definition of your next-generation platform — before the host board and management architecture are frozen — when interfaces, telemetry, security functions and extensions can be configured at lowest cost.",
      },
    ],
    metaTitle: "L-Nex™ DC-SCM BMC Module | Logic Fruit Technologies",
    metaDescription:
      "A configurable, field-upgradable BMC platform for the OCP DC-SCM 2.x socket — shaped around your platform at design-in, upgradable in the field for the life of the server.",
    canonicalUrl: `/products/${slug}`,
    directDownload: false,
    order: 0,
  };

  const existing = await dynamoService.getBySlug(slug);

  if (existing) {
    console.log(`Product already exists with ID: ${existing.id || existing._id}. Updating...`);
    const updated = await dynamoService.update(existing.id || existing._id, productData);
    console.log("Successfully updated L-Nex product in DynamoDB:", updated);
  } else {
    console.log("Product does not exist. Creating new entry in DynamoDB...");
    const created = await dynamoService.create("product", productData);
    console.log("Successfully created L-Nex product in DynamoDB:", created);
  }

  process.exit(0);
}

upsertLnex().catch((err) => {
  console.error("Error upserting L-Nex product:", err);
  process.exit(1);
});
