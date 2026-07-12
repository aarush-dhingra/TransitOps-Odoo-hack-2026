'use strict';

const nodemailer = require('nodemailer');

// Transporter is lazily initialised so the app boots even if SMTP env vars
// are not yet configured (useful in test / dev without a real mail server).
let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error(
      'Email is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env'
    );
  }

  _transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  _transporter._fromAddress = SMTP_FROM || SMTP_USER;
  return _transporter;
}

function otpEmailHtml(name, otp) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 480px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
    .header { background: #1e40af; padding: 28px 32px; }
    .header h1 { color: #fff; margin: 0; font-size: 20px; letter-spacing: .5px; }
    .body { padding: 32px; color: #374151; }
    .otp-box { background: #f0f4ff; border: 2px dashed #1e40af; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0; }
    .otp-box span { font-size: 38px; font-weight: 700; letter-spacing: 12px; color: #1e40af; }
    .note { font-size: 13px; color: #6b7280; margin-top: 16px; }
    .footer { background: #f9fafb; padding: 16px 32px; text-align: center; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>TransitOps — Password Reset</h1></div>
    <div class="body">
      <p>Hi <strong>${name}</strong>,</p>
      <p>We received a request to reset your TransitOps account password. Use the OTP below — it expires in <strong>10 minutes</strong>.</p>
      <div class="otp-box"><span>${otp}</span></div>
      <p class="note">If you did not request a password reset, you can safely ignore this email. Your password will not change.</p>
    </div>
    <div class="footer">© ${new Date().getFullYear()} TransitOps. All rights reserved.</div>
  </div>
</body>
</html>`;
}

async function sendOtpEmail(toEmail, toName, otp) {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"TransitOps" <${transporter._fromAddress}>`,
    to: toEmail,
    subject: `Your TransitOps OTP: ${otp}`,
    html: otpEmailHtml(toName, otp),
    text: `Hi ${toName},\n\nYour OTP for password reset is: ${otp}\n\nIt expires in 10 minutes.\n\nIf you did not request this, ignore this email.`,
  });
}

module.exports = { sendOtpEmail };
