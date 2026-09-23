import nodemailer from "nodemailer";

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
export async function sendEmail({ to, subject, html, text }) {
  // Skip sending if emails are disabled via env
  if (process.env.ENABLE_EMAILS !== "true") {
    console.log(`📧 Email skipped (ENABLE_EMAILS is not 'true') → To: ${to}, Subject: ${subject}`);
    return { skipped: true, reason: "ENABLE_EMAILS is not true" };
  }

  const transporter = createTransporter();
  const from = process.env.MAIL_FROM || `"Logic Fruit Technologies" <${process.env.SMTP_USER || "info@logic-fruit.com"}>`;

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    text: text || html.replace(/<[^>]+>/g, ""),
    html,
  });

  return info;
}

/**
 * Send an email notification to the Logic Fruit team when a new inquiry arrives.
 */
export async function sendInquiryAlertToAdmin(inquiry) {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || "info@logic-fruit.com";

  const typeLabels = {
    contact: "Contact Inquiry",
    job: "Current Opening Application",
    newsletter: "Newsletter Subscription",
    whitepaper: "Whitepaper Download",
    product: "Product Inquiry",
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
              ${inquiry.resourceTitle ? `<tr><td class="label">Related Item:</td><td class="value">${inquiry.resourceTitle}</td></tr>` : ""}
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
          </div>
          <div class="footer">
            Logic Fruit Technologies CMS Notifications • <a href="mailto:${inquiry.email}" style="color: #f97316;">Reply directly to submitter</a>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: adminEmail,
    subject,
    html,
  });
}

/**
 * Send an automated confirmation email to the user who filled out the form.
 */
export async function sendUserConfirmation(inquiry) {
  if (!inquiry.email) return null;

  const isWhitepaper = inquiry.type === "whitepaper";
  const isProduct = inquiry.type === "product";

  let subject = "Thank you for reaching out to Logic Fruit Technologies";
  let leadGreeting = `Thank you for contacting Logic Fruit Technologies. We have received your inquiry regarding <strong>${inquiry.resourceTitle || "our engineering solutions"}</strong>.`;

  if (isWhitepaper) {
    subject = `Your Whitepaper Request - ${inquiry.resourceTitle || "Logic Fruit Technologies"}`;
    leadGreeting = `Thank you for your interest in our technical resources. We have received your request for <strong>"${inquiry.resourceTitle || "Whitepaper"}"</strong>.`;
  } else if (isProduct) {
    subject = `Product Inquiry: ${inquiry.resourceTitle || "Logic Fruit Technologies"}`;
    leadGreeting = `Thank you for your inquiry about <strong>${inquiry.resourceTitle || "our product"}</strong>. Our technical engineering team is reviewing your requirements.`;
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
            <p>Our domain experts will review your request and get back to you shortly.</p>
            
            <div class="card">
              <strong>Summary of your submission:</strong><br>
              • <strong>Type:</strong> ${inquiry.type || "Contact"}<br>
              • <strong>Subject / Item:</strong> ${inquiry.resourceTitle || "Engineering Inquiry"}<br>
              ${inquiry.company ? `• <strong>Company:</strong> ${inquiry.company}<br>` : ""}
            </div>

            <p>If you have any immediate questions or would like to share additional technical requirements, feel free to reply directly to this email or reach us at <a href="mailto:info@logic-fruit.com" style="color: #f97316;">info@logic-fruit.com</a>.</p>

            <p style="margin-top: 24px;">
              Warm regards,<br>
              <strong>Logic Fruit Technologies Team</strong><br>
              <span style="font-size: 13px; color: #64748b;">www.logic-fruit.com</span>
            </p>
          </div>
          <div class="footer">
            Logic Fruit Technologies • Innovative Embedded & Digital System Engineering<br>
            <a href="https://www.logic-fruit.com">Visit our website</a> | <a href="mailto:info@logic-fruit.com">info@logic-fruit.com</a>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: inquiry.email,
    subject,
    html,
  });
}
