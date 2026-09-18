import { dynamoService } from "./dynamoService.js";

const SITE_URL = "https://www.logic-fruit.com";

const STATIC_ROUTES = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  { path: "/solutions", priority: "0.9", changefreq: "weekly" },
  { path: "/products/soft-ip", priority: "0.9", changefreq: "weekly" },
  { path: "/products/hardware-systems", priority: "0.9", changefreq: "weekly" },
  { path: "/blogs", priority: "0.9", changefreq: "weekly" },
  { path: "/news", priority: "0.8", changefreq: "weekly" },
  { path: "/whitepaper", priority: "0.8", changefreq: "monthly" },
  { path: "/careers", priority: "0.8", changefreq: "weekly" },
  { path: "/career/jobs-current-opening/", priority: "0.8", changefreq: "daily" },
  { path: "/about-us", priority: "0.8", changefreq: "monthly" },
  { path: "/leadership", priority: "0.7", changefreq: "monthly" },
  { path: "/partner-ecosystem", priority: "0.7", changefreq: "monthly" },
  { path: "/quality-security", priority: "0.7", changefreq: "monthly" },
  { path: "/contact", priority: "0.8", changefreq: "monthly" },
  { path: "/telecom", priority: "0.8", changefreq: "monthly" },
  { path: "/datacenter", priority: "0.8", changefreq: "monthly" },
  { path: "/aiml", priority: "0.8", changefreq: "monthly" },
  { path: "/defence", priority: "0.8", changefreq: "monthly" },
  { path: "/semiconductor", priority: "0.8", changefreq: "monthly" },
  { path: "/robotics", priority: "0.8", changefreq: "monthly" },
  { path: "/terms-of-use", priority: "0.3", changefreq: "yearly" },
  { path: "/privacy-policy", priority: "0.3", changefreq: "yearly" },
  { path: "/cookie-policy", priority: "0.3", changefreq: "yearly" },
];

/**
 * Builds the complete dynamic XML sitemap including all static pages
 * and live published CMS items (blogs, news, whitepapers, products, jobs).
 */
export async function generateDynamicSitemapXml() {
  const today = new Date().toISOString().split("T")[0];
  const urls = [];

  // 1. Static site routes
  STATIC_ROUTES.forEach((r) => {
    urls.push({
      loc: r.path === "/" ? `${SITE_URL}/` : `${SITE_URL}${r.path}`,
      lastmod: today,
      changefreq: r.changefreq,
      priority: r.priority,
    });
  });

  // Helper to fetch published items safely
  const fetchPublished = async (entityType) => {
    try {
      const items = await dynamoService.getAll(entityType, { status: "published" });
      return Array.isArray(items) ? items : [];
    } catch {
      return [];
    }
  };

  // 2. Published Blogs
  const blogs = await fetchPublished("blog");
  blogs.forEach((b) => {
    if (b.slug && !b.noIndex) {
      urls.push({
        loc: `${SITE_URL}/blogs/${b.slug}`,
        lastmod: b.updatedAt ? b.updatedAt.split("T")[0] : today,
        changefreq: "weekly",
        priority: "0.8",
      });
    }
  });

  // 3. Published News
  const news = await fetchPublished("news");
  news.forEach((n) => {
    if (n.slug && !n.noIndex) {
      urls.push({
        loc: `${SITE_URL}/news/${n.slug}`,
        lastmod: n.updatedAt ? n.updatedAt.split("T")[0] : today,
        changefreq: "monthly",
        priority: "0.7",
      });
    }
  });

  // 4. Published Whitepapers
  const whitepapers = await fetchPublished("whitepaper");
  whitepapers.forEach((w) => {
    if (w.slug && !w.noIndex) {
      urls.push({
        loc: `${SITE_URL}/whitepaper/${w.slug}`,
        lastmod: w.updatedAt ? w.updatedAt.split("T")[0] : today,
        changefreq: "monthly",
        priority: "0.8",
      });
    }
  });

  // 5. Published Products
  const products = await fetchPublished("product");
  products.forEach((p) => {
    if (p.slug && !p.noIndex) {
      urls.push({
        loc: `${SITE_URL}/products/${p.slug}`,
        lastmod: p.updatedAt ? p.updatedAt.split("T")[0] : today,
        changefreq: "weekly",
        priority: "0.8",
      });
    }
  });

  // 6. Published Job Openings
  const jobs = await fetchPublished("job");
  jobs.forEach((j) => {
    if (j.slug && !j.noIndex) {
      urls.push({
        loc: `${SITE_URL}/career/jobs-current-opening/${j.slug}`,
        lastmod: j.updatedAt ? j.updatedAt.split("T")[0] : today,
        changefreq: "weekly",
        priority: "0.8",
      });
    }
  });

  // Deduplicate by URL
  const uniqueUrls = [];
  const seen = new Set();
  for (const item of urls) {
    if (!seen.has(item.loc)) {
      seen.add(item.loc);
      uniqueUrls.push(item);
    }
  }

  const entriesXml = uniqueUrls
    .map(
      (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entriesXml}
</urlset>
`;
}
