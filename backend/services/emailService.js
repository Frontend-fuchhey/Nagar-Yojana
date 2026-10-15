const nodemailer = require("nodemailer");

/**
 * Sends onboarding email with temporary credentials to newly provisioned Ward Executive.
 *
 * @param {Object} params
 * @param {string} params.email - Executive's email address
 * @param {string} params.fullName - Executive's full name
 * @param {number|string} params.wardNumber - Assigned Ward number (1-19)
 * @param {string} params.servicePeriod - Tenure or service period (e.g. "2081 - 2086 B.S.")
 * @param {string} params.executiveId - Sequential Executive ID (e.g. "WE-4-1")
 * @param {string} params.tempPassword - Generated 8-character temporary password
 * @returns {Promise<{success: boolean, messageId?: string, simulated?: boolean}>}
 */
async function sendWardExecCredentials({
  email,
  fullName,
  wardNumber,
  servicePeriod = "2081 - 2086 B.S.",
  executiveId,
  tempPassword
}) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || '"Nagarयोजना Administration" <no-reply@nagaryojana.gov.np>';
  const portalUrl = "https://nagar-yojana.pages.dev/?portal=staff";

  const subject = `Nagarयोजना — Ward Executive Appointment & Credentials (Ward ${wardNumber} • ${executiveId})`;

  // If SMTP is not configured in development, log securely to console and resolve gracefully
  if (!smtpHost || !smtpUser || !smtpPass) {
    console.log("================================================================================");
    console.log("[EmailService] 📧 SIMULATED CREDENTIALS EMAIL (SMTP not configured in environment)");
    console.log(`To:                    ${fullName} <${email}>`);
    console.log(`Subject:               ${subject}`);
    console.log(`Official Executive ID: ${executiveId}`);
    console.log(`Appointed Ward:        Ward ${wardNumber}`);
    console.log(`Service Period:        ${servicePeriod}`);
    console.log(`Login Email:           ${email}`);
    console.log(`Temporary Password:    ${tempPassword}`);
    console.log(`Portal Link:           ${portalUrl}`);
    console.log("Notice:                Password must be updated on initial sign-in.");
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

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .header { background: #0f172a; padding: 28px 24px; color: #ffffff; text-align: center; }
        .header h1 { margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px; }
        .header p { margin: 8px 0 0; font-size: 14px; color: #94a3b8; }
        .body { padding: 32px 24px; }
        .body h2 { margin-top: 0; color: #0f172a; font-size: 20px; }
        .intro-text { font-size: 15px; line-height: 1.6; color: #334155; }
        .credentials-card { background: #f8fafc; border-radius: 10px; padding: 20px 24px; margin: 24px 0; border: 1px solid #cbd5e1; }
        .cred-item { margin-bottom: 12px; font-size: 15px; display: flex; align-items: baseline; }
        .cred-item:last-child { margin-bottom: 0; }
        .cred-label { font-weight: 600; color: #475569; width: 170px; flex-shrink: 0; }
        .cred-value { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 15px; color: #0f172a; font-weight: 700; }
        .cred-badge { display: inline-block; background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 14px; }
        .alert-box { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px 16px; margin: 24px 0; border-radius: 4px; font-size: 14px; color: #92400e; }
        .cta-container { text-align: center; margin: 32px 0 20px; }
        .btn { display: inline-block; background: #2563eb; color: #ffffff !important; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; box-shadow: 0 2px 4px rgba(37,99,235,0.2); }
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
          <h2>Ward Executive Appointment & Official Credentials</h2>
          <p class="intro-text">
            Dear <strong>${fullName}</strong>,<br>
            You have been officially provisioned as the <strong>Ward Executive</strong> for <strong>Ward ${wardNumber}</strong> in the Biratnagar Metropolitan City Nagarयोजना Portal.
          </p>
          
          <div class="credentials-card">
            <div class="cred-item">
              <span class="cred-label">Official Executive ID:</span>
              <span class="cred-value cred-badge">${executiveId}</span>
            </div>
            <div class="cred-item">
              <span class="cred-label">Appointed Ward:</span>
              <span class="cred-value">Ward ${wardNumber}</span>
            </div>
            <div class="cred-item">
              <span class="cred-label">Service Period / Tenure:</span>
              <span class="cred-value">${servicePeriod}</span>
            </div>
            <div class="cred-item">
              <span class="cred-label">Login Email:</span>
              <span class="cred-value">${email}</span>
            </div>
            <div class="cred-item">
              <span class="cred-label">Temporary Password:</span>
              <span class="cred-value">${tempPassword}</span>
            </div>
          </div>

          <div class="alert-box">
            <strong>Security Notice:</strong> You are required to update your temporary password on initial sign-in to secure your Ward Executive account.
          </div>

          <div class="cta-container">
            <a href="${portalUrl}" class="btn">Access Staff & Executive Portal</a>
          </div>
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
    text: `Welcome ${fullName},\n\nYou have been officially provisioned as Ward Executive for Ward ${wardNumber}.\n\nOfficial Executive ID: ${executiveId}\nAppointed Ward: Ward ${wardNumber}\nService Period / Tenure: ${servicePeriod}\nLogin Email: ${email}\nTemporary Password: ${tempPassword}\nPortal Link: ${portalUrl}\n\nSecurity Notice: You are required to update your temporary password on initial sign-in.`,
    html: htmlContent
  });

  return { success: true, messageId: info.messageId };
}

module.exports = {
  sendWardExecCredentials
};
