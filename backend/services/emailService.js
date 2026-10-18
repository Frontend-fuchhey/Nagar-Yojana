const { Resend } = require('resend');
require('dotenv').config();

const resend = new Resend(process.env.RESEND_API_KEY);

const sendWardExecCredentials = async ({ email, wardNumber, tempPassword, fullName, executiveId, servicePeriod }) => {
    try {
        const portalUrl = 'https://nagaryojana.shrawankarki.com.np/?portal=staff';
        const recipientName = fullName ? fullName : 'Executive';
        const wardLabel = wardNumber !== undefined ? wardNumber : '';
        const idLabel = executiveId ? ` (${executiveId})` : '';

        const { data, error } = await resend.emails.send({
            from: 'Nagarयोजना Admin <admin@shrawankarki.com.np>',
            to: email,
            subject: `Nagarयोजना - Ward Executive Appointment & Credentials (Ward ${wardLabel})`,
            text: `Dear ${recipientName},\n\nYou have been officially provisioned as the Ward Executive for Ward ${wardLabel}${idLabel} in the Biratnagar Metropolitan City Nagarयोजना Portal.\n\nLogin Email: ${email}\nTemporary Password: ${tempPassword}\n\nPlease log in at: ${portalUrl}\n\nSecurity Notice: You are required to update your temporary password on initial sign-in to secure your account.`,
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1d1d1f; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                    <h2 style="color: #0066cc;">Welcome to Nagarयोजना</h2>
                    <p>Dear ${recipientName},</p>
                    <p>You have been officially provisioned as the Ward Executive for <strong>Ward ${wardLabel}</strong>${idLabel} of Biratnagar Metropolitan City.</p>
                    <div style="background-color: #f5f5f7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0; font-size: 14px; color: #555;">Temporary Password:</p>
                        <h3 style="margin: 5px 0 0 0; letter-spacing: 2px;">${tempPassword}</h3>
                    </div>
                    <p>Please log in and change your password immediately to secure your access.</p>
                    <a href="${portalUrl}" style="display: inline-block; background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 20px; font-weight: bold; margin-top: 10px;">Access Secure Portal</a>
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
