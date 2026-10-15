const nodemailer = require("nodemailer");

/**
 * Sends onboarding email with temporary credentials to newly provisioned Ward Executive.
 *
 * @param {Object} params
 * @param {string} params.email - Executive's email address
 * @param {string} params.fullName - Executive's full name
 * @param {number|string} params.wardNumber - Assigned Ward number (1-19)
 * @param {string} params.tempPassword - Generated 8-character temporary password
 * @returns {Promise<{success: boolean, messageId?: string, simulated?: boolean}>}
 */
async function sendWardExecCredentials({ email, fullName, wardNumber, tempPassword }) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || '"Nagarयोजना Administration" <no-reply@nagaryojana.gov.np>';
  const portalUrl = process.env.FRONTEND_URL || "http://localhost:5173";

  // If SMTP is not configured in development, log securely to console and resolve gracefully
  if (!smtpHost || !smtpUser || !smtpPass) {
    console.log("================================================================================");
    console.log("[EmailService] 📧 SIMULATED CREDENTIALS EMAIL (SMTP not configured in environment)");
    console.log(`To:             ${fullName} <${email}>`);
    console.log(`Subject:        Nagarयोजना Portal - Ward Executive Credentials (Ward ${wardNumber})`);
    console.log(`Assigned Ward:  Ward ${wardNumber}`);
    console.log(`Portal URL:     ${portalUrl}/login`);
    console.log(`Email/Username: ${email}`);
    console.log(`Temp Password:  ${tempPassword}`);
    console.log("Notice:         User must change password upon first login.");
    console.log("================================================================================");
    return { success: true, simulated: true };
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // true for port 465, false for 587
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });

  const subject = `Nagarयोजना Portal - Ward Executive Credentials (Ward ${wardNumber})`;
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
        .header { background: #0f172a; padding: 24px; color: #ffffff; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; letter-spacing: -0.5px; }
        .header p { margin: 6px 0 0; font-size: 14px; color: #94a3b8; }
        .body { padding: 32px 24px; }
        .alert-box { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0; border-radius: 4px; }
        .credentials-card { background: #f1f5f9; border-radius: 8px; padding: 20px; margin: 24px 0; border: 1px solid #cbd5e1; }
        .cred-item { margin-bottom: 12px; font-size: 15px; }
        .cred-item:last-child { margin-bottom: 0; }
        .cred-label { font-weight: 600; color: #475569; display: inline-block; width: 140px; }
        .cred-value { font-family: monospace; font-size: 16px; color: #0f172a; font-weight: 600; }
        .btn { display: inline-block; background: #2563eb; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; }
        .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Nagarयोजना</h1>
          <p>Biratnagar Metropolitan City Civic Infrastructure Governance</p>
        </div>
        <div class="body">
          <h2>Welcome, ${fullName}</h2>
          <p>You have been provisioned as the <strong>Ward Executive</strong> for <strong>Ward ${wardNumber}</strong> in the Biratnagar Metropolitan City Nagarयोजना Portal.</p>
          
          <div class="credentials-card">
            <div class="cred-item">
              <span class="cred-label">Portal URL:</span>
              <span class="cred-value">${portalUrl}/login</span>
            </div>
            <div class="cred-item">
              <span class="cred-label">Username / Email:</span>
              <span class="cred-value">${email}</span>
            </div>
            <div class="cred-item">
              <span class="cred-label">Temporary Password:</span>
              <span class="cred-value">${tempPassword}</span>
            </div>
            <div class="cred-item">
              <span class="cred-label">Assigned Ward:</span>
              <span class="cred-value">Ward ${wardNumber}</span>
            </div>
          </div>

          <div class="alert-box">
            <strong>Security Notice:</strong> You are required to change this temporary password upon your initial login to secure your ward executive account.
          </div>

          <p style="text-align: center;">
            <a href="${portalUrl}/login" class="btn">Log In to Nagarयोजना Portal</a>
          </p>
        </div>
        <div class="footer">
          <p>Biratnagar Metropolitan City | Civic Infrastructure Monitoring Portal</p>
          <p>This is an automated system dispatch. Please do not reply directly to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const info = await transporter.sendMail({
    from: smtpFrom,
    to: email,
    subject,
    text: `Welcome ${fullName},\n\nYou have been provisioned as Ward Executive for Ward ${wardNumber}.\n\nPortal: ${portalUrl}/login\nEmail: ${email}\nTemporary Password: ${tempPassword}\n\nPlease change your password upon initial login.`,
    html: htmlContent
  });

  return { success: true, messageId: info.messageId };
}

module.exports = {
  sendWardExecCredentials
};
