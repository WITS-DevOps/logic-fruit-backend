import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { emailTemplateService } from "./emailTemplateService.js";
import { dynamoService } from "./dynamoService.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Creates and returns the email transporter using environment settings.
 */
function createTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const user = process.env.SMTP_USER || "info@logic-fruit.com";
  const pass = (process.env.SMTP_PASS || "").replace(/\s+/g, "");

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

/**
 * Converts direct AWS S3 URLs to publicly accessible URLs.
 * Because the AWS account enforces organizational S3 Block Public Access,
 * direct S3 links return AccessDenied. Serving them via our public media route
 * (https://api.logic-fruit.com/api/upload/media/...) allows anyone in the world to download them publicly.
 */
export function toPublicDownloadUrl(url) {
  if (!url || typeof url !== "string") return "";

  const s3Match = url.match(/^https?:\/\/[^\/]+\.s3\.[^\/]+\.amazonaws\.com\/(.+)$/i);
  if (s3Match && s3Match[1]) {
    const rawKey = s3Match[1];
    const baseUrl = process.env.BASE_URL || "https://api.logic-fruit.com";
    return `${baseUrl.replace(/\/api\/?$/, "")}/api/upload/media/${rawKey}`;
  }

  return url;
}

/**
 * Resolves the matching PDF download URL for a product or whitepaper.
 * Priority:
 * 1. Explicit inquiry.pdfUrl if already supplied in form
 * 2. Database CMS record (Product CMS datasheetUrl or Whitepaper CMS pdfUrl)
 * 3. Fallback matching from wp_pdfs_manifest.json (legacy WordPress S3 archive)
 */
export async function getDownloadUrlForResource(inquiry) {
  let resolvedUrl = "";

  if (inquiry.pdfUrl && inquiry.pdfUrl.trim()) {
    resolvedUrl = inquiry.pdfUrl.trim();
  }

  const slug = inquiry.resourceSlug || "";
  const title = inquiry.resourceTitle || "";

  // 1. Query the Product CMS if product inquiry
  if (!resolvedUrl && (inquiry.type === "product" || inquiry.type === "datasheet")) {
    try {
      let product = null;
      if (slug) {
        product = await dynamoService.getBySlugOrId("product", slug);
      }
      if (!product && title) {
        const allProds = await dynamoService.getAll("product");
        const normTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "");
        product = allProds.find((p) => {
          const pTitle = (p.title || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          const pSlug = (p.slug || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          return pTitle.includes(normTitle) || normTitle.includes(pTitle) || pSlug === normTitle;
        });
      }

      if (product && product.datasheetUrl && product.datasheetUrl.trim()) {
        resolvedUrl = product.datasheetUrl.trim();
      }
    } catch (e) {
      console.warn("Could not query Product CMS for datasheet:", e.message);
    }
  }

  // 2. Query the Whitepaper CMS if whitepaper inquiry
  if (!resolvedUrl && inquiry.type === "whitepaper") {
    try {
      let whitepaper = null;
      if (slug) {
        whitepaper = await dynamoService.getBySlugOrId("whitepaper", slug);
      }
      if (!whitepaper && title) {
        const allWps = await dynamoService.getAll("whitepaper");
        const normTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "");
        whitepaper = allWps.find((w) => {
          const wTitle = (w.title || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          const wSlug = (w.slug || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          return wTitle.includes(normTitle) || normTitle.includes(wTitle) || wSlug === normTitle;
        });
      }

      if (whitepaper && whitepaper.pdfUrl && whitepaper.pdfUrl.trim()) {
        resolvedUrl = whitepaper.pdfUrl.trim();
      }
    } catch (e) {
      console.warn("Could not query Whitepaper CMS for pdfUrl:", e.message);
    }
  }

  // 3. Fallback: match from wp_pdfs_manifest.json
  if (!resolvedUrl) {
    const manifestPath = path.join(__dirname, "../../data/wp_pdfs_manifest.json");
    if (fs.existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
        const query = (slug || title).toLowerCase().replace(/[^a-z0-9]/g, "");

        if (query) {
          const found = manifest.find((item) => {
            const itemKey = (item.filename + " " + item.title)
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "");
            return itemKey.includes(query) || (query.length > 5 && itemKey.includes(query.slice(0, 8)));
          });
          if (found) resolvedUrl = found.s3Url;
        }
      } catch (e) {
        console.warn("Could not read wp_pdfs_manifest:", e.message);
      }
    }
  }

  // 4. Default fallback for whitepapers if not found anywhere else
  if (!resolvedUrl && inquiry.type === "whitepaper") {
    const bucket = process.env.AWS_S3_BUCKET_NAME || "logicfruit-cms-assets-833823555826";
    const region = process.env.AWS_REGION || "ap-south-1";
    resolvedUrl = `https://${bucket}.s3.${region}.amazonaws.com/whitepapers/FPGAs_in_Next-Gen_Test_and_Measurement-version-1.2.pdf`;
  }

  return toPublicDownloadUrl(resolvedUrl);
}

/**
 * Verify if email credentials and connection are working.
 */
export async function verifyEmailConnection() {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    return {
      success: true,
      message: "Email server connection is verified and ready.",
    };
  } catch (error) {
    console.error("❌ Email connection error:", error.message);
    return {
      success: false,
      message: error.message,
    };
  }
}

/**
 * Send a general email.
 * Controlled by ENABLE_EMAILS env var — set to 'true' to actually send.
 */
export async function sendEmail({ to, cc, bcc, subject, html, text, fromName, replyTo }) {
  if (process.env.ENABLE_EMAILS !== "true") {
    console.log(
      `📧 [EMAIL SIMULATION - ENABLE_EMAILS=false] Would send to: ${to}${cc ? ` | CC: ${cc}` : ""} | Subject: ${subject}`
    );
    return { skipped: true, reason: "ENABLE_EMAILS is not true" };
  }

  const transporter = createTransporter();
  const defaultFrom = process.env.MAIL_FROM || `"Logic Fruit Technologies" <${process.env.SMTP_USER || "info@logic-fruit.com"}>`;
  const from = fromName
    ? `"${fromName}" <${process.env.SMTP_USER || "info@logic-fruit.com"}>`
    : defaultFrom;

  const mailOptions = {
    from,
    to,
    subject,
    text: text || html.replace(/<[^>]+>/g, ""),
    html,
  };

  if (cc) {
    mailOptions.cc = cc;
  }
  if (bcc) {
    mailOptions.bcc = bcc;
  }
  if (replyTo) {
    mailOptions.replyTo = replyTo;
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`\n============================================================`);
    console.log(`✉️  EMAIL SENT SUCCESSFULLY VIA SMTP`);
    console.log(`   To         : ${mailOptions.to}`);
    if (mailOptions.cc) console.log(`   CC         : ${mailOptions.cc}`);
    if (mailOptions.bcc) console.log(`   BCC        : ${mailOptions.bcc}`);
    console.log(`   From       : ${mailOptions.from}`);
    console.log(`   Subject    : ${mailOptions.subject}`);
    console.log(`   Message ID : ${info.messageId}`);
    console.log(`   Time       : ${new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })} IST`);
    console.log(`============================================================\n`);
    return info;
  } catch (error) {
    console.error(`\n❌ [SMTP ERROR] Failed to send email:`, error.message);
    console.error(`   To     : ${mailOptions.to}`);
    console.error(`   Subject: ${mailOptions.subject}\n`);
    throw error;
  }
}


/**
 * Resolves internal recipients (to, cc, bcc) from the Database.
 * Priority:
 * 1. Database (DynamoDB / local database) via emailTemplateService.getGlobalRoutingSettings()
 * 2. Environment variables as fallback if not set in DB
 * 3. Default legacy team emails as final fallback
 */
export async function resolveLeadRecipientsAndCc(type = "contact") {
  let to = "";
  let cc = "";
  let bcc = "";

  try {
    const settings = await emailTemplateService.getGlobalRoutingSettings();
    if (settings) {
      if (type === "job") {
        to = settings.careersEmail || "";
        cc = settings.careersCcEmails || "";
      } else {
        to = settings.internalLeadEmails || "";
        cc = settings.leadCcEmails || "";
        bcc = settings.leadBccEmails || "";
      }
    }
  } catch (err) {
    console.warn("Could not read recipient settings, using fallback:", err.message);
  }

  // Fallback to environment variables if not configured
  if (!to || !to.trim()) {
    if (type === "job") {
      to = process.env.CAREERS_NOTIFICATION_EMAIL || "careers@logic-fruit.com";
    } else {
      to =
        process.env.INTERNAL_LEAD_EMAILS ||
        process.env.LEAD_NOTIFICATION_EMAILS ||
        "jaswant.singh@logic-fruit.com, meenu.kukreja@logic-fruit.com";
    }
  }

  return {
    to: to.trim(),
    cc: cc && cc.trim() ? cc.trim() : undefined,
    bcc: bcc && bcc.trim() ? bcc.trim() : undefined,
  };
}

/**
 * Synchronous fallback helper for backward compatibility.
 */
export function getInternalLeadRecipients(type = "contact") {
  const envCareerEmails = process.env.CAREERS_NOTIFICATION_EMAIL;
  const envInternalEmails =
    process.env.INTERNAL_LEAD_EMAILS ||
    process.env.LEAD_NOTIFICATION_EMAILS;

  if (type === "job") {
    return envCareerEmails || "careers@logic-fruit.com, jaswant.singh@logic-fruit.com";
  }

  return envInternalEmails || "jaswant.singh@logic-fruit.com, meenu.kukreja@logic-fruit.com";
}

/**
 * Send an email notification to the Logic Fruit team when a new inquiry arrives.
 * Pulls customizable template and routing recipients from the Database.
 */
export async function sendInquiryAlertToAdmin(inquiry) {
  const categoryAlertMap = {
    product: "product_internal_alert",
    whitepaper: "whitepaper_internal_alert",
    job: "careers_internal_alert",
    newsletter: "newsletter_internal_alert",
    contact: "contact_internal_alert",
  };
  const templateKey = categoryAlertMap[inquiry.type] || "contact_internal_alert";

  const routing = await resolveLeadRecipientsAndCc(inquiry.type);
  let adminEmails = routing.to;
  const ccEmails = routing.cc;
  const bccEmails = routing.bcc;

  console.log(`\n📬 [CMS Lead Alert] Processing inquiry for: "${inquiry.name || "Visitor"}" (${inquiry.email})`);
  console.log(`   Lead Type:       ${(inquiry.type || "contact").toUpperCase()} - ${inquiry.resourceTitle || "General"}`);
  console.log(`   Team Recipients: To=${adminEmails}${ccEmails ? ` | CC=${ccEmails}` : ""}${bccEmails ? ` | BCC=${bccEmails}` : ""}`);

  try {
    const template = await emailTemplateService.getTemplateByKey(templateKey);
    // If the template in DB specifies an explicit recipient override, use that
    if (template && template.internalRecipientsOverride && template.internalRecipientsOverride.trim()) {
      adminEmails = template.internalRecipientsOverride.trim();
      console.log(`   Recipient Override: ${adminEmails}`);
    }

    console.log(`   CMS DB Template: "${template?.name || templateKey}" (Key: ${templateKey})`);

    const { subject, html, replyTo, senderName } = emailTemplateService.renderInternalAlert(
      template,
      inquiry
    );

    return await sendEmail({
      to: adminEmails,
      cc: ccEmails,
      bcc: bccEmails,
      subject,
      html,
      fromName: senderName,
      replyTo: replyTo || inquiry.email,
    });
  } catch (err) {
    console.warn("⚠️ Could not load template from DB, using internal fallback:", err.message);
  }


  const typeLabels = {
    contact: "Contact Inquiry",
    job: "Current Opening Application",
    newsletter: "Newsletter Subscription",
    whitepaper: "Whitepaper Download Request",
    product: "Product & Datasheet Inquiry",
    general: "General Inquiry",
  };

  const typeLabel = typeLabels[inquiry.type] || "Website Lead";
  const subject = `[New Lead - ${typeLabel}] from ${inquiry.name || "Visitor"} (${inquiry.company || "Individual"})`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; background-color: #f7f9fb; margin: 0; padding: 20px; color: #1e293b; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
          .header { background: #0f172a; padding: 24px; text-align: center; }
          .header h1 { color: #f97316; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }
          .header p { color: #94a3b8; margin: 6px 0 0; font-size: 14px; }
          .content { padding: 24px; }
          .badge { display: inline-block; background: #fff7ed; color: #c2410c; border: 1px solid #ffedd5; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 16px; }
          .table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          .table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; vertical-align: top; }
          .table td.label { font-weight: 600; color: #64748b; width: 35%; }
          .table td.value { color: #0f172a; }
          .message-box { background: #f8fafc; border-left: 4px solid #f97316; padding: 14px 16px; margin-top: 16px; border-radius: 4px; font-size: 14px; line-height: 1.6; color: #334155; }
          .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Logic Fruit Technologies</h1>
            <p>New Form Submission Received</p>
          </div>
          <div class="content">
            <span class="badge">${typeLabel}</span>
            <table class="table">
              <tr>
                <td class="label">Full Name:</td>
                <td class="value"><strong>${inquiry.name || "N/A"}</strong></td>
              </tr>
              <tr>
                <td class="label">Email Address:</td>
                <td class="value"><a href="mailto:${inquiry.email}">${inquiry.email}</a></td>
              </tr>
              ${inquiry.phone ? `<tr><td class="label">Phone:</td><td class="value">${inquiry.phone}</td></tr>` : ""}
              ${inquiry.company ? `<tr><td class="label">Company / Role:</td><td class="value">${inquiry.company}</td></tr>` : ""}
              ${inquiry.industry ? `<tr><td class="label">Industry / Link:</td><td class="value">${inquiry.industry}</td></tr>` : ""}
              ${inquiry.resourceTitle ? `<tr><td class="label">Related Item:</td><td class="value"><strong>${inquiry.resourceTitle}</strong></td></tr>` : ""}
              ${inquiry.pageUrl ? `<tr><td class="label">Source Page URL:</td><td class="value"><a href="${inquiry.pageUrl}" target="_blank">${inquiry.pageUrl}</a></td></tr>` : ""}
              <tr>
                <td class="label">Submitted At:</td>
                <td class="value">${new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })} IST</td>
              </tr>
            </table>

            <h4 style="margin: 20px 0 6px 0; color: #334155;">Message / Requirements:</h4>
            <div class="message-box">
              ${(inquiry.message || "No message provided.").replace(/\n/g, "<br>")}
            </div>

            <div style="text-align: center; margin: 26px 0 16px 0;">
              <a href="${process.env.CLIENT_URL || process.env.FRONTEND_URL || "https://dev.logic-fruit.tech"}/lft-admin-portal/inquiries" target="_blank" style="display: inline-block; background-color: #0f172a; color: #ffffff !important; padding: 13px 26px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 6px; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2);">
                📂 Open &amp; Manage Lead in CMS Portal
              </a>
              <p style="font-size: 12px; color: #64748b; margin: 8px 0 0 0;">
                Lead record stored in CMS Database &bull; Status: New
              </p>
            </div>
          </div>
          <div class="footer">
            Logic Fruit Technologies CMS Notifications • <a href="mailto:${inquiry.email}" style="color: #f97316;">Reply directly to submitter</a>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: adminEmails,
    subject,
    html,
    replyTo: inquiry.email,
  });
}

export async function sendUserConfirmation(inquiry) {
  if (!inquiry.email) return null;

  const isWhitepaper = inquiry.type === "whitepaper";
  const isProduct = inquiry.type === "product";
  const downloadUrl = await getDownloadUrlForResource(inquiry);

  // Template key resolution matching DB templates
  const visitorTemplateMap = {
    product: "product_customer_datasheet",
    whitepaper: "whitepaper_customer_download",
    job: "careers_candidate_acknowledgment",
    newsletter: "newsletter_welcome",
    contact: "contact_customer_confirmation",
  };
  const templateKey = visitorTemplateMap[inquiry.type] || "contact_customer_confirmation";

  console.log(`\n📤 [CMS Visitor Confirmation] Preparing response to: "${inquiry.name || "Customer"}" <${inquiry.email}>`);
  if (downloadUrl) {
    console.log(`   Download Button URL: ${downloadUrl}`);
  }

  try {
    const template = await emailTemplateService.getTemplateByKey(templateKey);
    if (template) {
      console.log(`   CMS DB Template: "${template.name}" (Subject: "${template.subject}")`);
      const { subject, html, senderName, replyTo } = emailTemplateService.renderVisitorEmail(
        template,
        inquiry,
        downloadUrl
      );

      return await sendEmail({
        to: inquiry.email,
        subject,
        html,
        fromName: senderName,
        replyTo: replyTo || "jaswant.singh@logic-fruit.com",
      });
    }
  } catch (err) {
    console.warn("⚠️ Could not load visitor template from DB, using fallback:", err.message);
  }

  let subject = "Thank you for reaching out to Logic Fruit Technologies";
  let senderName = "Jaswant from Logic Fruit";
  let leadGreeting = `Thank you for contacting Logic Fruit Technologies. We have received your inquiry regarding <strong>${inquiry.resourceTitle || "our engineering solutions"}</strong>.`;


  if (isWhitepaper) {
    subject = "Here is your whitepaper you requested on Logic Fruit Technologies Website";
    leadGreeting = `Thank you for your interest in our technical resources. Here is the whitepaper you requested: <strong>"${inquiry.resourceTitle || "Logic Fruit Whitepaper"}"</strong>.`;
  } else if (isProduct) {
    subject = `${inquiry.resourceTitle || "Product"} Datasheet from Logic Fruit Technologies`;
    leadGreeting = `Thank you for requesting the technical datasheet for <strong>"${inquiry.resourceTitle || "Logic Fruit Product"}"</strong>.`;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; background-color: #f7f9fb; margin: 0; padding: 20px; color: #1e293b; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
          .header { background: #0f172a; padding: 28px 24px; text-align: center; }
          .header h1 { color: #f97316; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }
          .header p { color: #94a3b8; margin: 6px 0 0; font-size: 14px; }
          .content { padding: 28px 24px; font-size: 15px; line-height: 1.6; color: #334155; }
          .card { background: #f8fafc; border-left: 4px solid #f97316; padding: 14px 16px; margin: 20px 0; border-radius: 4px; font-size: 14px; }
          .cta-btn { display: inline-block; background-color: #f97316; color: #ffffff !important; padding: 12px 24px; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 6px; margin: 18px 0; text-align: center; }
          .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
          .footer a { color: #f97316; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Logic Fruit Technologies</h1>
            <p>Embedded Systems • FPGA • High Speed Digital Systems</p>
          </div>
          <div class="content">
            <p>Dear ${inquiry.name || "Customer"},</p>
            <p>${leadGreeting}</p>
            
            ${
              downloadUrl
                ? `
                  <div style="text-align: center; margin: 28px 0 24px 0;">
                    <a href="${downloadUrl}" target="_blank" class="cta-btn">
                      ${isWhitepaper ? "📄 Download Whitepaper (PDF)" : "📑 Download Datasheet (PDF)"}
                    </a>
                  </div>
                `
                : ""
            }

            <div class="card">
              <strong>Request Summary:</strong><br>
              • <strong>Category:</strong> ${inquiry.type ? inquiry.type.toUpperCase() : "GENERAL"}<br>
              • <strong>Resource / Topic:</strong> ${inquiry.resourceTitle || "Technical Inquiry"}<br>
              ${inquiry.company ? `• <strong>Company:</strong> ${inquiry.company}<br>` : ""}
            </div>

            <p>Our engineering team is at your disposal if you would like to discuss custom specifications, integration assistance, or hardware/IP customization.</p>

            <p>Feel free to reply directly to this email or contact us anytime at <a href="mailto:info@logic-fruit.com" style="color: #f97316;">info@logic-fruit.com</a>.</p>

            <p style="margin-top: 24px;">
              Warm regards,<br>
              <strong>${senderName}</strong><br>
              Logic Fruit Technologies<br>
              <span style="font-size: 13px; color: #64748b;"><a href="https://www.logic-fruit.com" style="color: #64748b;">www.logic-fruit.com</a></span>
            </p>
          </div>
          <div class="footer">
            Logic Fruit Technologies • Innovative Embedded & Digital System Engineering<br>
            Plot No. 109, Sector 44, Gurugram, Haryana 122003, India
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: inquiry.email,
    subject,
    html,
    fromName: senderName,
    replyTo: "jaswant.singh@logic-fruit.com",
  });
}
