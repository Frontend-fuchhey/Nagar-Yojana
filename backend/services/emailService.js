const { Resend } = require('resend');
require('dotenv').config();

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Dispatches official onboarding credentials to an appointed Ward Executive.
 * Sender: "Nagarयोजना Admin <admin@shrawankarki.com.np>"
 * Subject: "Action Required: Official Credentials for Ward {displayWard} Executive"
 */
const sendWardExecCredentials = async ({ name, fullName, email, wardNumber, tempPassword, executiveId, servicePeriod }) => {
    try {
        const recipientName = name || fullName || 'Executive';
        const displayWard = wardNumber !== undefined ? wardNumber : '';
        const displayExecId = executiveId || `WE-${displayWard}-1`;
        const displayTenure = servicePeriod || '2082 - 2087 B.S.';
        const portalUrl = 'https://nagaryojana.shrawankarki.com.np/?portal=staff';

        const { data, error } = await resend.emails.send({
            from: 'Nagarयोजना Admin <admin@shrawankarki.com.np>',
            to: email,
            subject: `Action Required: Official Credentials for Ward ${displayWard} Executive`,
            text: `Dear ${recipientName},\n\nYou have been officially provisioned as the Ward Executive for Ward ${displayWard} in the Biratnagar Metropolitan City Nagarयोजना Portal.\n\nLogin Email: ${email}\nTemporary Password: ${tempPassword}\n\nPlease log in at: ${portalUrl}\n\nSecurity Notice: You are required to update your temporary password on initial sign-in to secure your account.`,
            html: `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Official Credentials for Ward ${displayWard} Executive</title>
<style type="text/css">
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
  @media only screen and (max-width: 480px) {
    .outer-wrap { padding: 12px 6px !important; }
    .card-padding { padding: 20px 14px !important; }
    .cred-box { padding: 14px 12px !important; margin: 18px 0 !important; }
    .resp-table, .resp-table tbody, .resp-row { display: block !important; width: 100% !important; }
    .resp-label { display: block !important; width: 100% !important; padding: 0 0 3px 0 !important; font-size: 12.5px !important; }
    .resp-val { display: block !important; width: 100% !important; padding: 0 0 10px 0 !important; }
    .btn-block { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; padding: 14px 16px !important; }
  }
</style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; -webkit-font-smoothing: antialiased;">
<div class="outer-wrap" style="background-color: #f3f4f6; padding: 32px 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; width: 100%; box-sizing: border-box;">
    <div style="width: 100%; max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); box-sizing: border-box;">
        
        <!-- Header -->
        <div style="background-color: #0f172a; padding: 30px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 600; letter-spacing: 0.5px;">Nagarयोजना</h1>
            <p style="color: #94a3b8; margin: 8px 0 0 0; font-size: 13px; letter-spacing: 0.5px;">Biratnagar Metropolitan City Civic Infrastructure Governance</p>
        </div>
        
        <!-- Body Container -->
        <div class="card-padding" style="padding: 28px 28px; box-sizing: border-box;">
            <h2 style="margin-top: 0; color: #111827; font-size: 19px; font-weight: 600;">Ward Executive Appointment & Official Credentials</h2>
            
            <p style="color: #374151; font-size: 14.5px; line-height: 1.6; margin-top: 18px;">Dear <strong>${recipientName}</strong>,</p>
            <p style="color: #374151; font-size: 14.5px; line-height: 1.6;">You have been officially provisioned as the <strong>Ward Executive</strong> for <strong>Ward ${displayWard}</strong> in the Biratnagar Metropolitan City Nagarयोजना Portal.</p>

            <!-- Credentials Box -->
            <div class="cred-box" style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 18px 20px; margin: 24px 0; background-color: #ffffff; box-sizing: border-box;">
                <table class="resp-table" style="width: 100%; font-size: 14px; border-collapse: collapse; table-layout: auto;">
                    <tr class="resp-row" style="border-bottom: 10px solid transparent;">
                        <td class="resp-label" style="color: #4b5563; width: 42%; font-weight: 500; vertical-align: middle; padding-right: 8px;">Official Executive ID:</td>
                        <td class="resp-val" style="vertical-align: middle;"><span style="background-color: #e0e7ff; color: #3730a3; padding: 4px 10px; border-radius: 4px; font-weight: 600; font-size: 13px; font-family: monospace;">${displayExecId}</span></td>
                    </tr>
                    <tr class="resp-row" style="border-bottom: 10px solid transparent;">
                        <td class="resp-label" style="color: #4b5563; width: 42%; font-weight: 500; vertical-align: middle; padding-right: 8px;">Appointed Ward:</td>
                        <td class="resp-val" style="font-weight: 600; color: #111827; vertical-align: middle;">Ward ${displayWard}</td>
                    </tr>
                    <tr class="resp-row" style="border-bottom: 10px solid transparent;">
                        <td class="resp-label" style="color: #4b5563; width: 42%; font-weight: 500; vertical-align: middle; padding-right: 8px;">Service Period / Tenure:</td>
                        <td class="resp-val" style="font-family: monospace; font-size: 14px; font-weight: 600; color: #111827; vertical-align: middle;">${displayTenure}</td>
                    </tr>
                    <tr class="resp-row" style="border-bottom: 10px solid transparent;">
                        <td class="resp-label" style="color: #4b5563; width: 42%; font-weight: 500; vertical-align: middle; padding-right: 8px;">Login Email:</td>
                        <td class="resp-val" style="vertical-align: middle; word-break: break-all; word-break: break-word;"><a href="mailto:${email}" style="color: #2563eb; text-decoration: none; font-weight: 500;">${email}</a></td>
                    </tr>
                    <tr class="resp-row">
                        <td class="resp-label" style="color: #4b5563; width: 42%; font-weight: 500; vertical-align: middle; padding-right: 8px;">Temporary Password:</td>
                        <td class="resp-val" style="vertical-align: middle;">
                            <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; display: inline-block; vertical-align: middle; max-width: 100%; box-sizing: border-box;">
                                <span style="font-family: ui-monospace, 'SF Mono', Consolas, Monaco, monospace; font-size: 16px; font-weight: 700; color: #1e3a8a; letter-spacing: 1.5px; vertical-align: middle; user-select: all; -webkit-user-select: all;">${tempPassword}</span>
                                <span role="button" tabindex="0" onclick="if(navigator.clipboard){navigator.clipboard.writeText('${tempPassword}');}else{var t=document.createElement('textarea');t.value='${tempPassword}';document.body.appendChild(t);t.select();document.execCommand('copy');document.body.removeChild(t);}alert('Password copied to clipboard!');" title="Copy Password" style="cursor: pointer; display: inline-block; margin-left: 8px; padding: 3px 6px; background-color: #e0e7ff; color: #2563eb; border-radius: 4px; font-size: 13px; line-height: 1.2; vertical-align: middle; border: 1px solid #c7d2fe; user-select: none; -webkit-user-select: none;">📋</span>
                            </div>
                        </td>
                    </tr>
                </table>
            </div>

            <!-- Security Notice -->
            <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px 16px; border-radius: 0 4px 4px 0; margin-bottom: 28px; box-sizing: border-box;">
                <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.5;"><strong>Security Notice:</strong> You are required to update your temporary password on initial sign-in to secure your Ward Executive account.</p>
            </div>

            <!-- Call to Action -->
            <div style="text-align: center;">
                <a href="${portalUrl}&email=${encodeURIComponent(email)}" class="btn-block" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 13px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14.5px; transition: background-color 0.2s;">Access Staff & Executive Portal</a>
            </div>
        </div>
    </div>
</div>
</body>
</html>
            `
        });

        if (error) {
            console.error("Resend API Error:", error);
            throw new Error(error.message);
        }

        console.log(`Email successfully sent to ${email} (Resend ID: ${data?.id})`);
        return true;

    } catch (error) {
        console.error("Failed to dispatch credentials:", error);
        throw error;
    }
};

/**
 * Dispatches official onboarding credentials to an appointed civic Contractor.
 * Sender Name: Strictly "Nagar Yojana" (No "Admin")
 * Subject Line: "Ward {Ward Number} | {Project Title} - Contractor Assignment"
 */
const sendContractorCredentials = async ({ name, companyName, email, wardNumber, tempPassword, contractorId, projectTitle, projectId }) => {
    try {
        const recipientName = name || companyName || 'Civic Contractor';
        const displayWard = wardNumber !== undefined ? wardNumber : '';
        const displayProject = projectTitle || 'Civic Infrastructure Project';
        const displayContractorId = contractorId || `CON-${displayWard}-1`;
        const portalUrl = 'https://nagaryojana.shrawankarki.com.np/?portal=contractor';

        const { data, error } = await resend.emails.send({
            from: 'Nagar Yojana <admin@shrawankarki.com.np>',
            to: email,
            subject: `Ward ${displayWard} | ${displayProject} - Contractor Assignment`,
            text: `Dear ${recipientName},\n\nYou have been officially appointed as the Project Contractor for "${displayProject}" in Ward ${displayWard} by the Biratnagar Metropolitan City.\n\nLogin Email: ${email}\nTemporary Password: ${tempPassword}\nContractor ID: ${displayContractorId}\n\nPlease access your Contractor Workspace to update project progress and milestones:\n${portalUrl}\n\nSecurity Notice: You are required to update your temporary password on initial sign-in.`,
            html: `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Contractor Project Assignment & Official Credentials</title>
<style type="text/css">
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
  @media only screen and (max-width: 480px) {
    .outer-wrap { padding: 12px 6px !important; }
    .card-padding { padding: 20px 14px !important; }
    .cred-box { padding: 14px 12px !important; margin: 18px 0 !important; }
    .resp-table, .resp-table tbody, .resp-row { display: block !important; width: 100% !important; }
    .resp-label { display: block !important; width: 100% !important; padding: 0 0 3px 0 !important; font-size: 12.5px !important; }
    .resp-val { display: block !important; width: 100% !important; padding: 0 0 10px 0 !important; }
    .btn-block { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; padding: 14px 16px !important; }
  }
</style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; -webkit-font-smoothing: antialiased;">
<div class="outer-wrap" style="background-color: #f3f4f6; padding: 32px 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; width: 100%; box-sizing: border-box;">
    <div style="width: 100%; max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); box-sizing: border-box;">
        
        <!-- Header -->
        <div style="background-color: #0f172a; padding: 30px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 600; letter-spacing: 0.5px;">Nagarयोजना</h1>
            <p style="color: #94a3b8; margin: 8px 0 0 0; font-size: 13px; letter-spacing: 0.5px;">Biratnagar Metropolitan City · Civic Infrastructure Execution Portal</p>
        </div>
        
        <!-- Body Container -->
        <div class="card-padding" style="padding: 28px 28px; box-sizing: border-box;">
            <h2 style="margin-top: 0; color: #111827; font-size: 19px; font-weight: 600;">Contractor Project Assignment & Official Credentials</h2>
            
            <p style="color: #374151; font-size: 14.5px; line-height: 1.6; margin-top: 18px;">Dear <strong>${recipientName}</strong>,</p>
            <p style="color: #374151; font-size: 14.5px; line-height: 1.6;">You have been officially appointed as the lead contractor for <strong>${displayProject}</strong> in <strong>Ward ${displayWard}</strong> under the Biratnagar Metropolitan City infrastructure oversight network.</p>

            <!-- Credentials Box -->
            <div class="cred-box" style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 18px 20px; margin: 24px 0; background-color: #ffffff; box-sizing: border-box;">
                <table class="resp-table" style="width: 100%; font-size: 14px; border-collapse: collapse; table-layout: auto;">
                    <tr class="resp-row" style="border-bottom: 10px solid transparent;">
                        <td class="resp-label" style="color: #4b5563; width: 42%; font-weight: 500; vertical-align: middle; padding-right: 8px;">Assigned Project:</td>
                        <td class="resp-val" style="font-weight: 700; color: #111827; vertical-align: middle;">${displayProject}</td>
                    </tr>
                    <tr class="resp-row" style="border-bottom: 10px solid transparent;">
                        <td class="resp-label" style="color: #4b5563; width: 42%; font-weight: 500; vertical-align: middle; padding-right: 8px;">Ward Jurisdiction:</td>
                        <td class="resp-val" style="font-weight: 600; color: #111827; vertical-align: middle;">Ward ${displayWard}</td>
                    </tr>
                    <tr class="resp-row" style="border-bottom: 10px solid transparent;">
                        <td class="resp-label" style="color: #4b5563; width: 42%; font-weight: 500; vertical-align: middle; padding-right: 8px;">Contractor ID:</td>
                        <td class="resp-val" style="vertical-align: middle;"><span style="background-color: #f0fdf4; color: #15803d; padding: 4px 10px; border-radius: 4px; font-weight: 600; font-size: 13px; font-family: monospace;">${displayContractorId}</span></td>
                    </tr>
                    <tr class="resp-row" style="border-bottom: 10px solid transparent;">
                        <td class="resp-label" style="color: #4b5563; width: 42%; font-weight: 500; vertical-align: middle; padding-right: 8px;">Login Email:</td>
                        <td class="resp-val" style="vertical-align: middle; word-break: break-all; word-break: break-word;"><a href="mailto:${email}" style="color: #2563eb; text-decoration: none; font-weight: 500;">${email}</a></td>
                    </tr>
                    <tr class="resp-row">
                        <td class="resp-label" style="color: #4b5563; width: 42%; font-weight: 500; vertical-align: middle; padding-right: 8px;">Temporary Password:</td>
                        <td class="resp-val" style="vertical-align: middle;">
                            <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; display: inline-block; vertical-align: middle; max-width: 100%; box-sizing: border-box;">
                                <span style="font-family: ui-monospace, 'SF Mono', Consolas, Monaco, monospace; font-size: 16px; font-weight: 700; color: #14532d; letter-spacing: 1.5px; vertical-align: middle; user-select: all; -webkit-user-select: all;">${tempPassword}</span>
                                <span role="button" tabindex="0" onclick="if(navigator.clipboard){navigator.clipboard.writeText('${tempPassword}');}else{var t=document.createElement('textarea');t.value='${tempPassword}';document.body.appendChild(t);t.select();document.execCommand('copy');document.body.removeChild(t);}alert('Password copied to clipboard!');" title="Copy Password" style="cursor: pointer; display: inline-block; margin-left: 8px; padding: 3px 6px; background-color: #dcfce7; color: #15803d; border-radius: 4px; font-size: 13px; line-height: 1.2; vertical-align: middle; border: 1px solid #bbf7d0; user-select: none; -webkit-user-select: none;">📋</span>
                            </div>
                        </td>
                    </tr>
                </table>
            </div>

            <!-- Operational Notice -->
            <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px 16px; border-radius: 0 4px 4px 0; margin-bottom: 28px; box-sizing: border-box;">
                <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.5;"><strong>Contractor Responsibility:</strong> You are authorized to report milestone progress percentage, update physical status, and file completion reports directly through your dedicated Contractor Workspace.</p>
            </div>

            <!-- Call to Action -->
            <div style="text-align: center;">
                <a href="${portalUrl}&email=${encodeURIComponent(email)}" class="btn-block" style="display: inline-block; background-color: #156947; color: #ffffff; padding: 13px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14.5px; transition: background-color 0.2s;">Contractor Portal Login</a>
            </div>
        </div>
    </div>
</div>
</body>
</html>
            `
        });

        if (error) {
            console.error("Resend API Error (Contractor):", error);
            throw new Error(error.message);
        }

        console.log(`Contractor email successfully sent to ${email} (Resend ID: ${data?.id})`);
        return true;

    } catch (error) {
        console.error("Failed to dispatch contractor credentials:", error);
        throw error;
    }
};


/**
 * Dispatches a password reset email to a user.
 */
const sendPasswordResetEmailService = async ({ email, name, resetLink }) => {
    try {
        const recipientName = name || 'User';
        const { data, error } = await resend.emails.send({
            from: 'Nagar Yojana <admin@shrawankarki.com.np>',
            to: email,
            subject: 'Password Reset Request - Nagarयोजना',
            text: `Dear ${recipientName},\n\nA password reset was requested for your Nagarयोजना account.\n\nPlease reset your password using this link:\n${resetLink}\n\nIf you did not request this, you can safely ignore this email.`,
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
                    <h2 style="color: #111827; margin-top: 0; font-size: 20px;">Nagarयोजना Password Reset</h2>
                    <p style="color: #4b5563; font-size: 14px;">Dear <strong>${recipientName}</strong>,</p>
                    <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">A password reset request was initiated for your municipal account (<strong>${email}</strong>).</p>
                    <div style="text-align: center; margin: 28px 0;">
                        <a href="${resetLink}" style="display: inline-block; background-color: #0066cc; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 9999px; font-weight: 600; font-size: 14px;">Reset Password</a>
                    </div>
                    <p style="color: #6b7280; font-size: 12px; line-height: 1.5;">If the button above does not work, copy and paste this link into your browser:<br/><a href="${resetLink}" style="color: #0066cc; word-break: break-all;">${resetLink}</a></p>
                    <p style="color: #9ca3af; font-size: 11px; margin-top: 24px; border-top: 1px solid #f3f4f6; padding-top: 12px;">If you did not request this password reset, please disregard this email.</p>
                </div>
            `
        });

        if (error) {
            console.warn('Resend API Warning (Password Reset):', error);
            return false;
        }
        return true;
    } catch (err) {
        console.warn('Could not dispatch password reset via Resend:', err.message);
        return false;
    }
};

module.exports = { sendWardExecCredentials, sendContractorCredentials, sendPasswordResetEmailService };
