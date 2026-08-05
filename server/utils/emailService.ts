import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter;

// Initialize the mail transporter
const initTransporter = async () => {
    if (transporter) return;

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        // Use real SMTP if configured
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: Number(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
        console.log('Using Production SMTP for Email Alerts');
    } else {
        // Generate test Ethereal account if no SMTP provided
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: testAccount.user, // generated ethereal user
                pass: testAccount.pass  // generated ethereal password
            }
        });
        console.log('Using Ethereal (Test) SMTP for Email Alerts. A link to the email will be printed in the console.');
    }
};

export const sendFamilyAlertEmail = async (toEmail: string, type: string, message: string, author: string) => {
    try {
        await initTransporter();

        const info = await transporter.sendMail({
            from: '"Vynora Family Board" <noreply@vynora.ai>',
            to: toEmail,
            subject: `New ${type} assigned to you!`,
            html: `
                <div style="font-family: Arial, sans-serif; background-color: #1a1a2e; color: #fff; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #00f2fe;">Vynora Family Alert</h2>
                    <p style="font-size: 16px;">Hello!</p>
                    <p style="font-size: 16px;">A new <strong>${type}</strong> was posted by <strong>${author}</strong> on the Family Board.</p>
                    <div style="background-color: #16213e; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #00f2fe;">
                        <p style="font-size: 18px; margin: 0; font-weight: bold;">"${message}"</p>
                    </div>
                    <p style="color: #888;">Log into Vynora to see more details.</p>
                </div>
            `
        });

        console.log('Message sent: %s', info.messageId);
        if (info.messageId && nodemailer.getTestMessageUrl(info)) {
            console.log('----------------------------------------------------');
            console.log('💌 PREVIEW EMAIL HERE: %s', nodemailer.getTestMessageUrl(info));
            console.log('----------------------------------------------------');
        }
    } catch (err) {
        console.error('Failed to send email:', err);
    }
};
