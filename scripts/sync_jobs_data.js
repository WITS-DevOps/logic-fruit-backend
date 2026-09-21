import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonPath = path.join(__dirname, "../data/current_openings.json");
const jsPath = path.join(__dirname, "../../logic-fruit-ui/src/components/jobsData.js");

const raw = fs.readFileSync(jsonPath, "utf8");
const jobs = JSON.parse(raw);

const enriched = jobs.map((j) => ({
  ...j,
  aliases: j.aliases || [j.slug],
}));

const fileContent = `/**
 * Shared Job Openings Data for Logic Fruit Technologies Careers
 * Synced with AWS DynamoDB and S3 asset storage.
 */

export const DEPARTMENTS = [
  "All Positions",
  "Management",
  "FPGA",
  "IT",
  "Hardware",
  "Verification",
];

export const JOB_OPENINGS = ${JSON.stringify(enriched, null, 2)};

/**
 * Lookup job opening by canonical slug or alias.
 */
export function getJobBySlug(slug) {
  if (!slug) return null;
  const cleanSlug = slug.toLowerCase().replace(/^\\/+|\\/+$/g, "");
  return (
    JOB_OPENINGS.find(
      (job) =>
        job.slug.toLowerCase() === cleanSlug ||
        job.id.toLowerCase() === cleanSlug ||
        (job.aliases && job.aliases.some((a) => a.toLowerCase() === cleanSlug))
    ) || null
  );
}

/**
 * Return all active job openings.
 */
export function getAllJobs() {
  return JOB_OPENINGS;
}

/**
 * Return other job openings excluding the current one.
 */
export function getRelatedJobs(currentSlug, limit = 3) {
  const current = getJobBySlug(currentSlug);
  const others = JOB_OPENINGS.filter(
    (job) => !current || job.slug !== current.slug
  );
  return others.slice(0, limit);
}
`;

fs.writeFileSync(jsPath, fileContent, "utf8");
console.log("Successfully synchronized jobsData.js with AWS DynamoDB schema & SEO metadata.");
