import nodemailer from 'nodemailer';
const smtpTransport = nodemailer.createTransport({
  pool: true,
  maxConnections: 1,
  service: process.env.MAILSERVICE,
  host: process.env.HOSTMAIL,
  port: Number(process.env.MAILPORT),
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.AUTHUSER,
    pass: process.env.AUTHPASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

export async function sendEmail(subject: string, html: string): Promise<void> {
  const authUser = process.env.AUTHUSER;
  const notifyEmail = process.env.NOTIFY_EMAIL;

  if (!process.env.MAILSERVICE) throw new Error('Missing env: MAILSERVICE');
  if (!process.env.HOSTMAIL) throw new Error('Missing env: HOSTMAIL');
  if (!process.env.MAILPORT) throw new Error('Missing env: MAILPORT');
  if (!authUser) throw new Error('Missing env: AUTHUSER');
  if (!process.env.AUTHPASS) throw new Error('Missing env: AUTHPASS');
  if (!notifyEmail) throw new Error('Missing env: NOTIFY_EMAIL');

  await smtpTransport.sendMail({
    from: `LMS 알림 <${authUser}>`,
    to: notifyEmail,
    subject,
    html,
  });
}
