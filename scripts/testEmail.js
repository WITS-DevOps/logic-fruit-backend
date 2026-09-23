import "dotenv/config";
import nodemailer from "nodemailer";

async function runTest() {
  console.log("Checking email configuration...");
  const user = process.env.SMTP_USER;
  const pass = (process.env.SMTP_PASS || "").replace(/\s+/g, "");
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "465", 10);

  console.log(`Connecting to ${host}:${port} as ${user}...`);

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  try {
    await transporter.verify();
    console.log("✅ SUCCESS: SMTP connection & credentials verified successfully!");

    console.log(`Sending test email to ${user}...`);
    const info = await transporter.sendMail({
      from: `"Logic Fruit Technologies" <${user}>`,
      to: user,
      subject: "Test Email - Logic Fruit Backend Setup Verified",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 24px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #f97316; margin-top: 0;">Logic Fruit Technologies - Email Service</h2>
          <p>This is a verification test email confirming that your email sending setup is fully active and working.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p><strong>Configured Sender:</strong> ${user}</p>
          <p><strong>SMTP Server:</strong> ${host}:${port}</p>
          <p><strong>Sent At:</strong> ${new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })} IST</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="font-size: 13px; color: #64748b;">Automated system check from Logic Fruit Technologies backend.</p>
        </div>
      `,
    });

    console.log("✅ SUCCESS: Test email sent!");
    console.log("Message ID:", info.messageId);
    process.exit(0);
  } catch (err) {
    console.error("❌ ERROR during email test:", err);
    process.exit(1);
  }
}

runTest();
