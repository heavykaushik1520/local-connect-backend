const nodemailer = require("nodemailer");
const env = require("../config/env");

let transporter = null;

function isSmtpConfigured() {
  return env.smtp.enabled && env.smtp.host && env.smtp.user && env.smtp.pass;
}

function getTransporter() {
  if (!isSmtpConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: {
        user: env.smtp.user,
        pass: env.smtp.pass
      }
    });
  }
  return transporter;
}

const emailService = {
  isSmtpConfigured,

  async sendMail({ to, subject, html, text }) {
    if (!to) {
      return { ok: false, skipped: true, reason: "missing_recipient" };
    }

    const payload = {
      from: env.smtp.from,
      to,
      subject,
      html,
      text: text || html?.replace(/<[^>]+>/g, " ")
    };

    const transport = getTransporter();
    if (!transport) {
      console.log("[email:dev-fallback]", JSON.stringify({ to, subject, text: payload.text }, null, 2));
      return { ok: true, devFallback: true };
    }

    await transport.sendMail(payload);
    return { ok: true, sent: true };
  }
};

module.exports = emailService;
