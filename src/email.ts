import nodemailer from 'nodemailer';

export async function sendEmail(subject: string, html: string): Promise<void> {
  const authUser = process.env.AUTHUSER;
  const notifyEmail = process.env.NOTIFY_EMAIL;

  if (!authUser) throw new Error('Missing env: AUTHUSER');
  if (!process.env.AUTHPASS) throw new Error('Missing env: AUTHPASS');
  if (!notifyEmail) throw new Error('Missing env: NOTIFY_EMAIL');

  const mailService = process.env.MAILSERVICE ?? 'gmail';
  const hostMail = process.env.HOSTMAIL ?? 'smtp.gmail.com';
  const mailPort = Number(process.env.MAILPORT ?? '587');

  const smtpTransport = nodemailer.createTransport({
    pool: true,
    maxConnections: 1,
    service: mailService,
    host: hostMail,
    port: mailPort,
    secure: false,
    requireTLS: true,
    auth: {
      user: authUser,
      pass: process.env.AUTHPASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  await smtpTransport.sendMail({
    from: `LMS 알림 <${authUser}>`,
    to: notifyEmail,
    subject,
    html,
  });
}
