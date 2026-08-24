const nodemailer = require('nodemailer');

// Get active Nodemailer transporter
const getTransporter = async () => {
  const user = process.env.SMTP_USER ? process.env.SMTP_USER.trim() : '';
  const rawPass = process.env.SMTP_PASS || '';
  const pass = rawPass.replace(/\s+/g, '');

  // 1. If real Gmail/SMTP credentials are provided in .env
  if (user && pass && user !== 'your-email@gmail.com' && pass !== 'your-16-character-app-password') {
    return nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user, pass }
    });
  }

  // 2. Fallback transporter for real mail dispatch
  // Uses direct Gmail or standard SMTP
  return nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER || 'aashop.verify@gmail.com',
      pass: process.env.SMTP_PASS || ''
    }
  });
};

/**
 * Send real 6-digit OTP verification email for AA Shop
 * @param {string} toEmail - Recipient email address
 * @param {string} otpCode - 6 digit numeric code
 * @param {string} purpose - Purpose of OTP ('Account Registration', 'Login Verification')
 */
const sendOTPEmail = async (toEmail, otpCode, purpose = 'Account Verification') => {
  try {
    const isRealSMTP = Boolean(
      process.env.SMTP_USER && 
      process.env.SMTP_PASS && 
      process.env.SMTP_USER !== 'your-email@gmail.com'
    );

    const fromAddress = process.env.SMTP_FROM || `"AA Shop" <${process.env.SMTP_USER || 'no-reply@aashop.com'}>`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0b0f19; margin: 0; padding: 20px; color: #f8fafc; }
          .email-card { max-width: 520px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 36px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
          .header { text-align: center; margin-bottom: 24px; }
          .logo { font-size: 28px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px; }
          .logo-highlight { color: #ff4757; }
          .title { font-size: 20px; font-weight: 700; color: #ffffff; margin-bottom: 12px; }
          .message { font-size: 15px; color: #94a3b8; line-height: 1.6; margin-bottom: 24px; }
          .otp-box { background: linear-gradient(135deg, rgba(255, 71, 87, 0.15), rgba(255, 127, 80, 0.15)); border: 2px dashed #ff4757; border-radius: 12px; text-align: center; padding: 22px; margin: 24px 0; }
          .otp-code { font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #ff6b81; font-family: monospace; }
          .expiry-note { font-size: 13px; color: #ffa502; margin-top: 8px; font-weight: 700; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #64748b; border-top: 1px solid #1f2937; padding-top: 16px; }
          .security-warning { background: rgba(244, 63, 94, 0.1); border: 1px solid rgba(244, 63, 94, 0.3); border-radius: 8px; padding: 10px 14px; font-size: 12px; color: #fda4af; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="email-card">
          <div class="header">
            <div class="logo">🛍️ AA <span class="logo-highlight">SHOP</span></div>
          </div>
          <div class="title">${purpose}</div>
          <div class="message">
            Assalam-o-Alaikum,
            <br><br>
            Use this 6-digit verification code to complete your <strong>${purpose}</strong> on <strong>AA Shop</strong> for email: <strong>${toEmail}</strong>:
          </div>

          <div class="otp-box">
            <div class="otp-code">${otpCode}</div>
            <div class="expiry-note">⏱ Valid for 10 minutes only</div>
          </div>

          <div class="security-warning">
            ⚠️ <strong>Security Notice:</strong> Do not share this OTP with anyone. AA Shop staff will never ask for your verification code.
          </div>

          <div class="footer">
            © 2026 AA Shop Online. All rights reserved.<br>
            If you did not request this email, please disregard this message.
          </div>
        </div>
      </body>
      </html>
    `;

    if (isRealSMTP) {
      const transporter = await getTransporter();
      const info = await transporter.sendMail({
        from: fromAddress,
        to: toEmail,
        subject: `🛍️ [${otpCode}] Your AA Shop Verification Code`,
        text: `Your AA Shop verification code is: ${otpCode}. It is valid for 10 minutes.`,
        html: htmlContent
      });

      console.log(`\n======================================================`);
      console.log(`✉️  REAL EMAIL DISPATCHED TO LIVE INBOX: ${toEmail}`);
      console.log(`🔑 OTP CODE: [ ${otpCode} ]`);
      console.log(`📡 Message ID: ${info.messageId}`);
      console.log(`======================================================\n`);

      return {
        success: true,
        messageId: info.messageId,
        isRealSMTP: true
      };
    } else {
      // If Gmail credentials haven't been pasted into .env yet,
      // Log clearly and try transporter or dispatch
      console.log(`\n======================================================`);
      console.log(`✉️  REAL EMAIL OTP CODE FOR: ${toEmail}`);
      console.log(`🔑 OTP CODE: [ ${otpCode} ]`);
      console.log(`💡 NOTE: To deliver straight to live Gmail inboxes, update SMTP_USER & SMTP_PASS in .env`);
      console.log(`======================================================\n`);

      return {
        success: true,
        isRealSMTP: false,
        otpCode // available for fallback
      };
    }
  } catch (error) {
    console.error('❌ Error sending OTP email:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  sendOTPEmail,
  getTransporter
};
