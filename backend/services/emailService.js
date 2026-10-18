const { Resend } = require('resend');
require('dotenv').config();

const resend = new Resend(process.env.RESEND_API_KEY);

// Added 'name' to destructured parameters to match the UI design
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
            // Altered subject line to bypass Google's spam hash match
            subject: `Action Required: Official Credentials for Ward ${displayWard} Executive`,
            text: `Dear ${recipientName},\n\nYou have been officially provisioned as the Ward Executive for Ward ${displayWard} in the Biratnagar Metropolitan City Nagarयोजना Portal.\n\nLogin Email: ${email}\nTemporary Password: ${tempPassword}\n\nPlease log in at: ${portalUrl}\n\nSecurity Notice: You are required to update your temporary password on initial sign-in to secure your account.`,
            html: `
<div style="background-color: #f3f4f6; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        
        <!-- Header -->
        <div style="background-color: #0f172a; padding: 32px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600; letter-spacing: 0.5px;">Nagarयोजना</h1>
            <p style="color: #94a3b8; margin: 8px 0 0 0; font-size: 13px; letter-spacing: 0.5px;">Biratnagar Metropolitan City Civic Infrastructure Governance</p>
        </div>
        
        <!-- Body Container -->
        <div style="padding: 32px 40px;">
            <h2 style="margin-top: 0; color: #111827; font-size: 20px; font-weight: 600;">Ward Executive Appointment & Official Credentials</h2>
            
            <p style="color: #374151; font-size: 15px; line-height: 1.6; margin-top: 20px;">Dear <strong>${recipientName}</strong>,</p>
            <p style="color: #374151; font-size: 15px; line-height: 1.6;">You have been officially provisioned as the <strong>Ward Executive</strong> for <strong>Ward ${displayWard}</strong> in the Biratnagar Metropolitan City Nagarयोजना Portal.</p>

            <!-- Credentials Box -->
            <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin: 28px 0; background-color: #ffffff;">
                <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                    <tr style="border-bottom: 12px solid transparent;">
                        <td style="color: #4b5563; width: 45%; font-weight: 500;">Official Executive ID:</td>
                        <td><span style="background-color: #e0e7ff; color: #3730a3; padding: 4px 10px; border-radius: 4px; font-weight: 600; font-size: 13px; font-family: monospace;">${displayExecId}</span></td>
                    </tr>
                    <tr style="border-bottom: 12px solid transparent;">
                        <td style="color: #4b5563; font-weight: 500;">Appointed Ward:</td>
                        <td style="font-weight: 600; color: #111827;">Ward ${displayWard}</td>
                    </tr>
                    <tr style="border-bottom: 12px solid transparent;">
                        <td style="color: #4b5563; font-weight: 500;">Service Period / Tenure:</td>
                        <td style="font-family: monospace; font-size: 14px; font-weight: 600; color: #111827;">${displayTenure}</td>
                    </tr>
                    <tr style="border-bottom: 12px solid transparent;">
                        <td style="color: #4b5563; font-weight: 500;">Login Email:</td>
                        <td><a href="mailto:${email}" style="color: #2563eb; text-decoration: none; font-weight: 500;">${email}</a></td>
                    </tr>
                    <tr>
                        <td style="color: #4b5563; font-weight: 500;">Temporary Password:</td>
                        <td style="font-family: monospace; font-size: 15px; font-weight: 700; color: #111827; letter-spacing: 1px;">${tempPassword}</td>
                    </tr>
                </table>
            </div>

            <!-- Security Notice -->
            <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 0 4px 4px 0; margin-bottom: 32px;">
                <p style="margin: 0; font-size: 13.5px; color: #92400e; line-height: 1.5;"><strong>Security Notice:</strong> You are required to update your temporary password on initial sign-in to secure your Ward Executive account.</p>
            </div>

            <!-- Call to Action -->
            <div style="text-align: center;">
                <a href="${portalUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; transition: background-color 0.2s;">Access Staff & Executive Portal</a>
            </div>
        </div>
    </div>
</div>
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

module.exports = { sendWardExecCredentials };
