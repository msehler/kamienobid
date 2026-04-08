function getEmailFromAddress() {
  return process.env.KAMIENO_FROM_EMAIL || "Kamieno <no-reply@kamieno.local>";
}

async function sendVerificationEmail({ to, verifyUrl, name }) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const from = getEmailFromAddress();
  const subject = "Verify your Kamieno account";
  const html = `
    <p>Hello ${escapeHtml(name || "there")},</p>
    <p>Thanks for signing up to Kamieno. Please verify your email address by clicking the link below:</p>
    <p><a href="${verifyUrl}">${verifyUrl}</a></p>
    <p>If you did not create this account, you can ignore this email.</p>
  `;

  if (!resendApiKey) {
    console.log(`[kamieno-email] Verification email fallback for ${to}: ${verifyUrl}`);
    return { sent: false, provider: "console" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Email delivery failed: ${payload}`);
  }

  return { sent: true, provider: "resend" };
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

module.exports = {
  sendVerificationEmail,
};
