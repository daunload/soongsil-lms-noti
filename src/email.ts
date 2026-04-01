import nodemailer from 'nodemailer';

// Send an HTML email via Gmail SMTP
// Reads GMAIL_USER, GMAIL_APP_PW, NOTIFY_EMAIL from process.env
// Throws if any env var is missing
export async function sendEmail(subject: string, html: string): Promise<void> {
  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPw = process.env.GMAIL_APP_PW;
  const notifyEmail = process.env.NOTIFY_EMAIL;

  if (!gmailUser) {
    throw new Error('Missing required environment variable: GMAIL_USER');
  }
  if (!gmailAppPw) {
    throw new Error('Missing required environment variable: GMAIL_APP_PW');
  }
  if (!notifyEmail) {
    throw new Error('Missing required environment variable: NOTIFY_EMAIL');
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailAppPw,
    },
  });

  await transporter.sendMail({
    from: `LMS 알림 <${gmailUser}>`,
    to: notifyEmail,
    subject,
    html,
  });
}
