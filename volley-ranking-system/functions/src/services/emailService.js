const nodemailer = require("nodemailer");

function getMailerConfig() {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_PASS;

  if (!gmailUser || !gmailPass) {
    return null;
  }

  return {
    gmailUser,
    transporter: nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    }),
  };
}

async function sendEmail({ to, subject, text, html }) {
  if (!to) {
    return { ok: false, reason: "missing-recipient" };
  }

  const mailerConfig = getMailerConfig();
  if (!mailerConfig) {
    console.error("Faltan secrets GMAIL_USER/GMAIL_PASS");
    return { ok: false, reason: "missing-secrets" };
  }

  await mailerConfig.transporter.sendMail({
    from: `"Volley Ranking" <${mailerConfig.gmailUser}>`,
    to,
    subject,
    text,
    html,
  });

  return { ok: true };
}

function getWebAppUrl() {
  const base = process.env.WEB_APP_URL || "https://tudominio.com";
  return base.replace(/\/+$/, "");
}

module.exports = {
  sendEmail,
  getWebAppUrl,
};
