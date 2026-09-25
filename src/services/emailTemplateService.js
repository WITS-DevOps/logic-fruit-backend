import { dynamoService } from "./dynamoService.js";

/**
 * Default Email Templates extracted and audited from the legacy WordPress site.
 * Used for initial database seeding and template resets.
 */
export const DEFAULT_EMAIL_TEMPLATES = [
  // --- 1. PRODUCTS & DATASHEETS ---
  {
    templateKey: "product_customer_datasheet",
    category: "products",
    target: "visitor",
    name: "Customer Datasheet Email",
    subject: "{{resourceTitle}} Datasheet from Logic Fruit Technologies",
    senderName: "Jaswant from Logic Fruit",
    replyTo: "jaswant.singh@logic-fruit.com",
    headerTitle: "Logic Fruit Technologies",
    headerSubtitle: "Embedded Systems • FPGA • High Speed Digital Systems",
    bannerImageUrl: "",
    greeting: "Dear {{name}},",
    mainMessage:
      'Thank you for requesting the technical datasheet for "{{resourceTitle}}". Click the button below to download the complete technical documentation.',
    showDownloadButton: true,
    buttonText: "📑 Download Datasheet (PDF)",
    buttonUrl: "{{downloadUrl}}",
    secondaryMessage:
      "Our engineering team is at your disposal if you would like to discuss custom specifications, integration assistance, or hardware/IP customization.\n\nFeel free to reply directly to this email or contact us anytime at info@logic-fruit.com.",
    internalRecipientsOverride: "",
    footerText:
      "Logic Fruit Technologies • Innovative Embedded & Digital System Engineering\nPlot No. 109, Sector 44, Gurugram, Haryana 122003, India",
    isActive: true,
  },
  {
    templateKey: "product_internal_alert",
    category: "products",
    target: "internal",
    name: "Internal Product Lead Alert",
    subject: "[New Product Lead] {{resourceTitle}} - {{name}} ({{company}})",
    senderName: "Logic Fruit Notifications",
    replyTo: "{{email}}",
    headerTitle: "Logic Fruit Technologies",
    headerSubtitle: "Product & Datasheet Inquiry Alert",
    bannerImageUrl: "",
    greeting: "Hello Sales & Product Team,",
    mainMessage:
      "A visitor has requested technical documentation for {{resourceTitle}} on the website:",
    showDownloadButton: false,
    buttonText: "View Inquiry Details",
    buttonUrl: "{{pageUrl}}",
    secondaryMessage:
      "Please review the prospect details below and schedule engineering follow-up.",
    internalRecipientsOverride: "",
    footerText:
      "Logic Fruit Technologies CMS Notifications • Reply directly to the submitter",
    isActive: true,
  },

  // --- 2. WHITEPAPERS ---
  {
    templateKey: "whitepaper_customer_download",
    category: "whitepapers",
    target: "visitor",
    name: "Customer Whitepaper Email",
    subject: "Here is your whitepaper you requested on Logic Fruit Technologies Website",
    senderName: "Jaswant from Logic Fruit",
    replyTo: "jaswant.singh@logic-fruit.com",
    headerTitle: "Logic Fruit Technologies",
    headerSubtitle: "Embedded Systems • FPGA • High Speed Digital Systems",
    bannerImageUrl: "",
    greeting: "Dear {{name}},",
    mainMessage:
      'Thank you for your interest in our technical resources. Here is the whitepaper you requested: "{{resourceTitle}}".',
    showDownloadButton: true,
    buttonText: "📄 Download Whitepaper (PDF)",
    buttonUrl: "{{downloadUrl}}",
    secondaryMessage:
      "Our engineering team is at your disposal if you would like to discuss custom specifications, integration assistance, or hardware/IP customization.\n\nFeel free to reply directly to this email or contact us anytime at info@logic-fruit.com.",
    internalRecipientsOverride: "",
    footerText:
      "Logic Fruit Technologies • Innovative Embedded & Digital System Engineering\nPlot No. 109, Sector 44, Gurugram, Haryana 122003, India",
    isActive: true,
  },
  {
    templateKey: "whitepaper_internal_alert",
    category: "whitepapers",
    target: "internal",
    name: "Internal Whitepaper Alert",
    subject: "[New Whitepaper Lead] {{resourceTitle}} - {{name}} ({{company}})",
    senderName: "Logic Fruit Notifications",
    replyTo: "{{email}}",
    headerTitle: "Logic Fruit Technologies",
    headerSubtitle: "Whitepaper Download Lead Received",
    bannerImageUrl: "",
    greeting: "Hello Team,",
    mainMessage:
      "A visitor has submitted a request for the whitepaper: {{resourceTitle}}:",
    showDownloadButton: false,
    buttonText: "View Inquiry Details",
    buttonUrl: "{{pageUrl}}",
    secondaryMessage:
      "Please review the lead details below and follow up accordingly.",
    internalRecipientsOverride: "",
    footerText:
      "Logic Fruit Technologies CMS Notifications • Reply directly to the submitter",
    isActive: true,
  },

  // --- 3. CONTACT & GENERAL INQUIRIES ---
  {
    templateKey: "contact_customer_confirmation",
    category: "contact",
    target: "visitor",
    name: "Customer Contact Confirmation",
    subject: "Thank you for reaching out to Logic Fruit Technologies",
    senderName: "Jaswant from Logic Fruit",
    replyTo: "jaswant.singh@logic-fruit.com",
    headerTitle: "Logic Fruit Technologies",
    headerSubtitle: "Embedded Systems • FPGA • High Speed Digital Systems",
    bannerImageUrl: "",
    greeting: "Dear {{name}},",
    mainMessage:
      'Thank you for contacting Logic Fruit Technologies. We have received your inquiry regarding "{{resourceTitle}}" and our engineering team will get back to you shortly.',
    showDownloadButton: true,
    buttonText: "Explore Logic Fruit Website",
    buttonUrl: "https://www.logic-fruit.com",
    secondaryMessage:
      "Our team will review your requirements and follow up within 24 business hours.\n\nIf you have an urgent inquiry, you can reach us directly at info@logic-fruit.com or call +91 124 4567890.",
    internalRecipientsOverride: "",
    footerText:
      "Logic Fruit Technologies • Innovative Embedded & Digital System Engineering\nPlot No. 109, Sector 44, Gurugram, Haryana 122003, India",
    isActive: true,
  },
  {
    templateKey: "contact_internal_alert",
    category: "contact",
    target: "internal",
    name: "Internal Contact Inquiry Alert",
    subject: "[New Website Inquiry] from {{name}} ({{company}})",
    senderName: "Logic Fruit Notifications",
    replyTo: "{{email}}",
    headerTitle: "Logic Fruit Technologies",
    headerSubtitle: "New Contact Form Submission Received",
    bannerImageUrl: "",
    greeting: "Hello Team,",
    mainMessage:
      "A new contact inquiry has just been submitted on the website:",
    showDownloadButton: false,
    buttonText: "View Inquiry Details",
    buttonUrl: "{{pageUrl}}",
    secondaryMessage:
      "Please review the inquiry details below and assign an engineering lead.",
    internalRecipientsOverride: "",
    footerText:
      "Logic Fruit Technologies CMS Notifications • Reply directly to the submitter",
    isActive: true,
  },

  // --- 4. CAREERS & JOB APPLICATIONS ---
  {
    templateKey: "careers_candidate_acknowledgment",
    category: "careers",
    target: "visitor",
    name: "Candidate Application Acknowledgment",
    subject: "Application Received: {{resourceTitle}} at Logic Fruit Technologies",
    senderName: "Logic Fruit Careers Team",
    replyTo: "careers@logic-fruit.com",
    headerTitle: "Logic Fruit Technologies",
    headerSubtitle: "Innovative Embedded & Digital System Engineering",
    bannerImageUrl: "",
    greeting: "Dear {{name}},",
    mainMessage:
      'Thank you for applying for the "{{resourceTitle}}" opening at Logic Fruit Technologies. We have successfully received your application and resume.',
    showDownloadButton: true,
    buttonText: "Explore Life at Logic Fruit",
    buttonUrl: "https://www.logic-fruit.com/career",
    secondaryMessage:
      "Our Talent Acquisition team will carefully review your qualifications against our role requirements. If your profile matches our criteria, our recruiter will reach out to schedule an interview.\n\nWe appreciate your interest in building the future with Logic Fruit!",
    internalRecipientsOverride: "",
    footerText:
      "Logic Fruit Technologies • Careers & Talent Acquisition\nPlot No. 109, Sector 44, Gurugram, Haryana 122003, India",
    isActive: true,
  },
  {
    templateKey: "careers_internal_alert",
    category: "careers",
    target: "internal",
    name: "Internal HR / Careers Alert",
    subject: "[New Job Application] {{resourceTitle}} - {{name}}",
    senderName: "Logic Fruit Careers Portal",
    replyTo: "{{email}}",
    headerTitle: "Logic Fruit Technologies",
    headerSubtitle: "New Candidate Application Received",
    bannerImageUrl: "",
    greeting: "Hello HR Team,",
    mainMessage:
      "A new job application has been submitted for {{resourceTitle}}:",
    showDownloadButton: false,
    buttonText: "View Candidate Details",
    buttonUrl: "{{pageUrl}}",
    secondaryMessage:
      "Please review candidate resume and follow up with the hiring manager.",
    internalRecipientsOverride: "careers@logic-fruit.com",
    footerText:
      "Logic Fruit Technologies Careers Portal • Reply directly to candidate",
    isActive: true,
  },

  // --- 5. NEWSLETTER SUBSCRIPTION ---
  {
    templateKey: "newsletter_welcome",
    category: "newsletter",
    target: "visitor",
    name: "Subscriber Welcome Email",
    subject: "Welcome to the Logic Fruit Technologies Newsletter",
    senderName: "Logic Fruit Editorial Team",
    replyTo: "info@logic-fruit.com",
    headerTitle: "Logic Fruit Technologies",
    headerSubtitle: "Embedded Systems • FPGA • High Speed Digital Systems",
    bannerImageUrl: "",
    greeting: "Dear Subscriber,",
    mainMessage:
      "Thank you for joining our community! You are now subscribed to receive curated technical articles, FPGA & high-speed digital engineering breakthroughs, and product announcements.",
    showDownloadButton: true,
    buttonText: "Browse Engineering Articles",
    buttonUrl: "https://www.logic-fruit.com/blogs",
    secondaryMessage:
      "We respect your inbox and only send high-value engineering insights.\n\nYou can update your preferences or reach us anytime at info@logic-fruit.com.",
    internalRecipientsOverride: "",
    footerText:
      "Logic Fruit Technologies • Innovative Embedded & Digital System Engineering\nPlot No. 109, Sector 44, Gurugram, Haryana 122003, India",
    isActive: true,
  },
  {
    templateKey: "newsletter_internal_alert",
    category: "newsletter",
    target: "internal",
    name: "Internal Newsletter Alert",
    subject: "[New Newsletter Subscriber] {{email}}",
    senderName: "Logic Fruit Notifications",
    replyTo: "{{email}}",
    headerTitle: "Logic Fruit Technologies",
    headerSubtitle: "New Newsletter Subscription",
    bannerImageUrl: "",
    greeting: "Hello Marketing Team,",
    mainMessage:
      "A new visitor has subscribed to the Logic Fruit newsletter from the website footer:",
    showDownloadButton: false,
    buttonText: "View Subscriber",
    buttonUrl: "{{pageUrl}}",
    secondaryMessage:
      "The contact has been logged into the inquiry leads database.",
    internalRecipientsOverride: "",
    footerText:
      "Logic Fruit Technologies CMS Notifications",
    isActive: true,
  },
];


/**
 * Replaces double-curly placeholders e.g. {{name}} with inquiry values.
 */
export function replacePlaceholders(text, vars = {}) {
  if (!text || typeof text !== "string") return "";
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    return vars[key] !== undefined && vars[key] !== null ? vars[key] : "";
  });
}

export const emailTemplateService = {
  /**
   * Get all templates from the database.
   * Auto-seeds any missing default templates.
   */
  async getAllTemplates() {
    let items = await dynamoService.getAll("email_template");

    // Auto-seed missing defaults
    const existingKeys = new Set(items.map((i) => i.templateKey));
    let hasNewSeeds = false;

    for (const def of DEFAULT_EMAIL_TEMPLATES) {
      if (!existingKeys.has(def.templateKey)) {
        await dynamoService.create("email_template", def);
        hasNewSeeds = true;
      }
    }

    if (hasNewSeeds) {
      items = await dynamoService.getAll("email_template");
    }

    // Preserve order matching DEFAULT_EMAIL_TEMPLATES
    const orderMap = {
      whitepaper_download: 1,
      datasheet_download: 2,
      contact_general: 3,
      lead_internal_notification: 4,
    };

    items.sort((a, b) => {
      const ordA = orderMap[a.templateKey] || 99;
      const ordB = orderMap[b.templateKey] || 99;
      return ordA - ordB;
    });

    return items;
  },

  /**
   * Get a single template by templateKey or id.
   */
  async getTemplateByKey(templateKey) {
    const aliasMap = {
      datasheet_download: "product_customer_datasheet",
      whitepaper_download: "whitepaper_customer_download",
      contact_general: "contact_customer_confirmation",
      lead_internal_notification: "contact_internal_alert",
    };
    const resolvedKey = aliasMap[templateKey] || templateKey;

    const all = await this.getAllTemplates();
    const found = all.find(
      (t) =>
        t.templateKey === resolvedKey ||
        t.templateKey === templateKey ||
        t.id === templateKey ||
        t._id === templateKey
    );
    if (found) return found;

    // Fallback to in-memory default
    return (
      DEFAULT_EMAIL_TEMPLATES.find(
        (t) => t.templateKey === resolvedKey || t.templateKey === templateKey
      ) || DEFAULT_EMAIL_TEMPLATES[0]
    );
  },


  /**
   * Update an email template by ID.
   */
  async updateTemplate(id, data) {
    return await dynamoService.update(id, data);
  },

  /**
   * Reset a template back to its legacy WordPress default.
   */
  async resetTemplate(templateKey) {
    const def = DEFAULT_EMAIL_TEMPLATES.find((t) => t.templateKey === templateKey);
    if (!def) throw new Error(`Default template not found for key: ${templateKey}`);

    const all = await dynamoService.getAll("email_template");
    const existing = all.find((t) => t.templateKey === templateKey);

    if (existing) {
      return await dynamoService.update(existing.id, def);
    } else {
      return await dynamoService.create("email_template", def);
    }
  },

  /**
   * Get global email routing settings stored in Database.
   * Priority: Database -> Environment Variables -> Legacy Defaults.
   */
  async getGlobalRoutingSettings() {
    try {
      let settings = await dynamoService.getById("global_routing_settings");
      if (!settings) {
        const all = await dynamoService.getAll("email_settings");
        if (all && all.length > 0) settings = all[0];
      }

      if (settings) {
        return settings;
      }

      // Initialize default routing in DB
      const defaultSettings = {
        id: "global_routing_settings",
        _id: "global_routing_settings",
        entityType: "email_settings",
        internalLeadEmails:
          process.env.INTERNAL_LEAD_EMAILS ||
          process.env.LEAD_NOTIFICATION_EMAILS ||
          "jaswant.singh@logic-fruit.com, meenu.kukreja@logic-fruit.com",
        leadCcEmails: "",
        leadBccEmails: "",
        careersEmail:
          process.env.CAREERS_NOTIFICATION_EMAIL || "careers@logic-fruit.com",
        careersCcEmails: "",
        productLeadEmails: "",
        productCcEmails: "",
        whitepaperLeadEmails: "",
        whitepaperCcEmails: "",
        contactLeadEmails: "",
        contactCcEmails: "",
        newsletterLeadEmails: "",
        newsletterCcEmails: "",
      };

      try {
        await dynamoService.create("email_settings", defaultSettings);
      } catch (_) {}

      return defaultSettings;
    } catch (err) {
      console.warn("Could not read routing settings from DB, using fallback:", err.message);
      return {
        internalLeadEmails:
          process.env.INTERNAL_LEAD_EMAILS ||
          process.env.LEAD_NOTIFICATION_EMAILS ||
          "jaswant.singh@logic-fruit.com, meenu.kukreja@logic-fruit.com",
        leadCcEmails: "",
        careersEmail: "careers@logic-fruit.com",
        careersCcEmails: "",
      };
    }
  },

  /**
   * Update global email routing settings in Database.
   */
  async updateGlobalRoutingSettings(updates) {
    let existing = await dynamoService.getById("global_routing_settings");
    if (!existing) {
      const all = await dynamoService.getAll("email_settings");
      if (all && all.length > 0) existing = all[0];
    }

    if (existing) {
      return await dynamoService.update(existing.id || "global_routing_settings", updates);
    } else {
      return await dynamoService.create("email_settings", {
        ...updates,
        id: "global_routing_settings",
        _id: "global_routing_settings",
      });
    }
  },


  /**
   * Render HTML and subject for visitor auto-responder emails.
   */
  renderVisitorEmail(template, inquiry, downloadUrl = "") {
    const vars = {
      name: inquiry.name || "Customer",
      email: inquiry.email || "",
      phone: inquiry.phone || "",
      company: inquiry.company || "Individual",
      industry: inquiry.industry || "",
      resourceTitle: inquiry.resourceTitle || "Technical Resource",
      downloadUrl: downloadUrl || inquiry.pdfUrl || "",
      type: inquiry.type ? inquiry.type.toUpperCase() : "GENERAL",
      date: new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    };

    const subject = replacePlaceholders(template.subject, vars);
    const greeting = replacePlaceholders(template.greeting, vars);
    const mainMessage = replacePlaceholders(template.mainMessage, vars);
    const buttonUrl = replacePlaceholders(template.buttonUrl, vars);
    const secondaryMessage = replacePlaceholders(template.secondaryMessage, vars);
    const headerTitle = template.headerTitle || "Logic Fruit Technologies";
    const headerSubtitle =
      template.headerSubtitle || "Embedded Systems • FPGA • High Speed Digital Systems";
    const footerText = template.footerText || "Logic Fruit Technologies";
    const senderName = template.senderName || "Jaswant from Logic Fruit";

    const bannerHtml = template.bannerImageUrl
      ? `<div style="text-align: center; margin-bottom: 20px;">
           <img src="${template.bannerImageUrl}" alt="${headerTitle}" style="max-width: 180px; max-height: 60px; object-fit: contain;" />
         </div>`
      : "";

    const ctaHtml =
      template.showDownloadButton && buttonUrl && buttonUrl.trim()
        ? `<div style="text-align: center; margin: 28px 0 24px 0;">
             <a href="${buttonUrl}" target="_blank" style="display: inline-block; background-color: #f97316; color: #ffffff !important; padding: 14px 32px; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 6px; box-shadow: 0 4px 14px rgba(249, 115, 22, 0.25);">
               ${template.buttonText || "Download Documentation"}
             </a>
           </div>`
        : "";

    const secondaryParagraphs = (secondaryMessage || "")
      .split("\n\n")
      .filter(Boolean)
      .map((p) => `<p style="margin: 12px 0; color: #475569; font-size: 14px; line-height: 1.6;">${p.replace(/\n/g, "<br>")}</p>`)
      .join("");

    const footerParagraphs = (footerText || "")
      .split("\n")
      .filter(Boolean)
      .map((line) => `<div>${line}</div>`)
      .join("");

    const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
      .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); }
      .header { background: #0f172a; padding: 28px 24px; text-align: center; }
      .header h1 { color: #f97316; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }
      .header p { color: #94a3b8; margin: 6px 0 0; font-size: 13px; }
      .content { padding: 32px 28px; font-size: 15px; line-height: 1.65; color: #334155; }
      .summary-card { background: #f8fafc; border-left: 4px solid #f97316; padding: 14px 18px; margin: 22px 0; border-radius: 6px; font-size: 14px; color: #334155; }
      .footer { background: #f8fafc; padding: 22px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; line-height: 1.5; }
      .footer a { color: #f97316; text-decoration: none; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        ${bannerHtml}
        <h1>${headerTitle}</h1>
        <p>${headerSubtitle}</p>
      </div>
      <div class="content">
        <p style="font-size: 16px; font-weight: 600; color: #0f172a; margin-top: 0;">${greeting}</p>
        <p style="margin: 14px 0; color: #334155;">${mainMessage}</p>

        ${ctaHtml}

        <div class="summary-card">
          <div style="font-weight: 700; color: #0f172a; margin-bottom: 6px;">Request Summary</div>
          <div>• <strong>Topic:</strong> ${vars.resourceTitle}</div>
          <div>• <strong>Category:</strong> ${vars.type}</div>
          ${vars.company ? `<div>• <strong>Company:</strong> ${vars.company}</div>` : ""}
        </div>

        ${secondaryParagraphs}

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #f1f5f9;">
          Warm regards,<br>
          <strong style="color: #0f172a; font-size: 15px;">${senderName}</strong><br>
          <span style="color: #64748b; font-size: 13px;">Logic Fruit Technologies</span><br>
          <a href="https://www.logic-fruit.com" style="color: #f97316; font-size: 13px; text-decoration: none;">www.logic-fruit.com</a>
        </div>
      </div>
      <div class="footer">
        ${footerParagraphs}
      </div>
    </div>
  </body>
</html>
    `;

    return { subject, html, senderName, replyTo: template.replyTo };
  },

  /**
   * Render HTML and subject for internal team alert emails.
   */
  renderInternalAlert(template, inquiry) {
    const typeLabels = {
      contact: "Contact Inquiry",
      job: "Job Application",
      newsletter: "Newsletter Subscription",
      whitepaper: "Whitepaper Download Request",
      product: "Product & Datasheet Request",
      general: "General Inquiry",
    };

    const clientUrl =
      process.env.CLIENT_URL ||
      process.env.FRONTEND_URL ||
      "https://dev.logic-fruit.tech";
    const inquiriesPortalUrl = `${clientUrl}/lft-admin-portal/inquiries`;

    const vars = {
      name: inquiry.name || "Website Visitor",
      email: inquiry.email || "N/A",
      phone: inquiry.phone || "N/A",
      company: inquiry.company || "Individual",
      industry: inquiry.industry || "N/A",
      resourceTitle: inquiry.resourceTitle || "General",
      typeLabel: typeLabels[inquiry.type] || "Website Lead",
      pageUrl: inquiry.pageUrl || "https://www.logic-fruit.com",
      message: inquiry.message || "No message provided.",
      adminUrl: inquiriesPortalUrl,
      date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
    };

    const subject = replacePlaceholders(template.subject, vars);
    const greeting = replacePlaceholders(template.greeting, vars);
    const mainMessage = replacePlaceholders(template.mainMessage, vars);
    const headerTitle = template.headerTitle || "Logic Fruit Technologies";
    const headerSubtitle = template.headerSubtitle || "New Website Form Submission Received";
    const footerText = template.footerText || "Logic Fruit Technologies CMS Notifications";

    const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
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
        <h1>${headerTitle}</h1>
        <p>${headerSubtitle}</p>
      </div>
      <div class="content">
        <span class="badge">${vars.typeLabel}</span>
        <p style="font-weight: 600; margin-top: 0;">${greeting}</p>
        <p style="margin-bottom: 14px; color: #475569;">${mainMessage}</p>

        <table class="table">
          <tr>
            <td class="label">Full Name:</td>
            <td class="value"><strong>${vars.name}</strong></td>
          </tr>
          <tr>
            <td class="label">Email Address:</td>
            <td class="value"><a href="mailto:${vars.email}">${vars.email}</a></td>
          </tr>
          ${inquiry.phone ? `<tr><td class="label">Phone:</td><td class="value">${vars.phone}</td></tr>` : ""}
          ${inquiry.company ? `<tr><td class="label">Company / Role:</td><td class="value">${vars.company}</td></tr>` : ""}
          ${inquiry.industry ? `<tr><td class="label">Industry / Field:</td><td class="value">${vars.industry}</td></tr>` : ""}
          ${inquiry.resourceTitle ? `<tr><td class="label">Related Resource:</td><td class="value"><strong>${vars.resourceTitle}</strong></td></tr>` : ""}
          ${inquiry.pageUrl ? `<tr><td class="label">Source Page:</td><td class="value"><a href="${vars.pageUrl}" target="_blank">${vars.pageUrl}</a></td></tr>` : ""}
          <tr>
            <td class="label">Submitted At:</td>
            <td class="value">${vars.date} IST</td>
          </tr>
        </table>

        <h4 style="margin: 20px 0 6px 0; color: #334155;">Message / Project Requirements:</h4>
        <div class="message-box">
          ${vars.message.replace(/\n/g, "<br>")}
        </div>

        <div style="text-align: center; margin: 26px 0 16px 0;">
          <a href="${inquiriesPortalUrl}" target="_blank" style="display: inline-block; background-color: #0f172a; color: #ffffff !important; padding: 13px 26px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 6px; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2);">
            📂 Open &amp; Manage Lead in CMS Portal
          </a>
          <p style="font-size: 12px; color: #64748b; margin: 8px 0 0 0;">
            Lead record stored in CMS Database &bull; Status: New
          </p>
        </div>

        ${template.secondaryMessage ? `<p style="margin: 18px 0 6px 0; color: #64748b; font-size: 13px; font-style: italic;">${replacePlaceholders(template.secondaryMessage, vars)}</p>` : ""}
      </div>
      <div class="footer">
        ${footerText} • <a href="mailto:${vars.email}" style="color: #f97316;">Reply directly to submitter</a>
      </div>
    </div>
  </body>
</html>
    `;

    return {
      subject,
      html,
      senderName: template.senderName || "Logic Fruit System",
      replyTo: inquiry.email,
    };
  },
};
