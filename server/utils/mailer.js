const nodemailer = require('nodemailer');
const Admin = require('../models/Admin');
const LocalUser = require('../models/LocalUser');

function splitEmails(value = '') {
  return String(value)
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);
}

function uniqueEmails(emails) {
  return Array.from(new Set(emails.filter(Boolean)));
}

function getFromEmail() {
  return process.env.MAIL_FROM_EMAIL || process.env.ALERT_FROM_EMAIL || process.env.SMTP_USER;
}

function isMailConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    getFromEmail()
  );
}

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function sendMail({ to, bcc, subject, text, html }) {
  const toList = uniqueEmails(Array.isArray(to) ? to : splitEmails(to));
  const bccList = uniqueEmails(Array.isArray(bcc) ? bcc : splitEmails(bcc));
  const recipients = uniqueEmails([...toList, ...bccList]);

  if (!recipients.length) {
    return { enabled: false, sent: false, recipients: 0, message: 'No email recipients are available.' };
  }

  if (!isMailConfigured()) {
    return {
      enabled: false,
      sent: false,
      recipients: recipients.length,
      message: 'SMTP is not configured.',
    };
  }

  const transporter = createTransporter();
  await transporter.sendMail({
    from: getFromEmail(),
    to: toList.length ? toList : undefined,
    bcc: bccList.length ? bccList : undefined,
    subject,
    text,
    html,
  });

  return { enabled: true, sent: true, recipients: recipients.length, message: 'Email sent.' };
}

async function getAdminEmailList() {
  const admins = await Admin.find({ email: { $exists: true, $ne: '' } }, 'email').lean();
  return uniqueEmails([
    ...splitEmails(process.env.ADMIN_NOTIFY_EMAIL),
    ...admins.map(admin => admin.email),
  ]);
}

async function getResidentEmailList() {
  const [users, admins] = await Promise.all([
    LocalUser.find({ email: { $exists: true, $ne: '' } }, 'email').lean(),
    Admin.find({ email: { $exists: true, $ne: '' } }, 'email').lean(),
  ]);

  return uniqueEmails([...users, ...admins].map(user => user.email));
}

module.exports = {
  escapeHtml,
  getAdminEmailList,
  getResidentEmailList,
  isMailConfigured,
  sendMail,
};
