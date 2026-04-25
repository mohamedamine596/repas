import nodemailer from "nodemailer";

let transporter = null;

function buildTransporter() {
  if (transporter) {
    return transporter;
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return transporter;
}

function appName() {
  return process.env.APP_NAME || "Kind Harvest";
}

function escapeHtml(input) {
  return String(input || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderEmailLayout({
  title,
  subtitle,
  bodyHtml,
  ctaLabel,
  ctaHref,
  footerNote,
}) {
  const safeTitle = escapeHtml(title);
  const safeSubtitle = escapeHtml(subtitle);
  const safeFooterNote = escapeHtml(footerNote || "");

  const ctaBlock =
    ctaLabel && ctaHref
      ? `<p style="margin:24px 0 0;">
         <a href="${escapeHtml(ctaHref)}" style="display:inline-block;background:#2d6a1f;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700;">${escapeHtml(ctaLabel)}</a>
       </p>`
      : "";

  return `
  <!doctype html>
  <html lang="fr">
    <body style="margin:0;padding:0;background:#f4f8f3;font-family:Arial,Helvetica,sans-serif;color:#16351f;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #e4ecdf;border-radius:16px;overflow:hidden;">
              <tr>
                <td style="background:linear-gradient(120deg,#1f5d2a,#2d6a1f);padding:24px;color:#ffffff;">
                  <p style="margin:0;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#f9c56f;font-weight:700;">BIENVENUE</p>
                  <h1 style="margin:10px 0 0;font-size:28px;line-height:1.2;">${safeTitle}</h1>
                  <p style="margin:10px 0 0;font-size:14px;color:#e8f3e4;">${safeSubtitle}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:24px;">
                  ${bodyHtml}
                  ${ctaBlock}
                  ${safeFooterNote ? `<p style="margin:22px 0 0;color:#4b5f51;font-size:13px;">${safeFooterNote}</p>` : ""}
                </td>
              </tr>
            </table>
            <p style="margin:14px 0 0;font-size:12px;color:#6d7f72;">${escapeHtml(appName())} - Cultivating Community, One Harvest at a Time.</p>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
}

async function deliverMail({ to, subject, text, html }) {
  const mailer = buildTransporter();

  if (!mailer) {
    console.log("[mailer] SMTP is not configured. Email skipped:", {
      to,
      subject,
    });
    console.log("[mailer] Email content (development mode):");
    console.log(text);
    return { delivered: false, skipped: true };
  }

  await mailer.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });

  return { delivered: true, skipped: false };
}

export async function sendOtpEmail({ to, name, code }) {
  const subject = `${appName()}: votre code de verification`;
  const safeName = escapeHtml(name || "ami solidaire");
  const safeCode = escapeHtml(code || "");
  const html = renderEmailLayout({
    title: "Verification email",
    subtitle: "Saisissez ce code a 6 chiffres pour confirmer votre compte.",
    bodyHtml: `
      <p style="margin:0 0 12px;font-size:15px;">Bonjour ${safeName},</p>
      <p style="margin:0 0 14px;font-size:15px;line-height:1.5;">Voici votre code OTP :</p>
      <p style="margin:0 0 16px;font-size:34px;letter-spacing:0.22em;font-weight:800;color:#2d6a1f;">${safeCode}</p>
      <p style="margin:0;font-size:14px;color:#4b5f51;">Ce code expire dans 10 minutes. Si vous n'etes pas a l'origine de cette demande, ignorez simplement cet email.</p>
    `,
    footerNote: "Pour votre securite, ne partagez jamais ce code.",
  });

  const text = [
    `Bonjour ${name || "ami solidaire"},`,
    "",
    `Votre code OTP: ${code}`,
    "Ce code expire dans 10 minutes.",
    "Ne partagez jamais ce code.",
  ].join("\n");

  return deliverMail({ to, subject, text, html });
}

export async function sendPasswordResetEmail({ to, name, resetUrl }) {
  const subject = `${appName()}: reinitialisation de mot de passe`;
  const safeName = escapeHtml(name || "ami solidaire");
  const safeResetUrl = escapeHtml(resetUrl || "");
  const html = renderEmailLayout({
    title: "Mot de passe oublie",
    subtitle:
      "Cliquez sur le lien ci-dessous pour creer un nouveau mot de passe.",
    bodyHtml: `
      <p style="margin:0 0 12px;font-size:15px;">Bonjour ${safeName},</p>
      <p style="margin:0 0 14px;font-size:15px;line-height:1.5;">Nous avons recu une demande de reinitialisation pour votre compte.</p>
      <p style="margin:0;font-size:14px;color:#4b5f51;line-height:1.5;">Le lien expire dans 60 minutes. Si vous n'etes pas a l'origine de cette demande, ignorez cet email.</p>
      <p style="margin:14px 0 0;font-size:13px;color:#6d7f72;word-break:break-all;">${safeResetUrl}</p>
    `,
    ctaLabel: "Reinitialiser mon mot de passe",
    ctaHref: resetUrl,
    footerNote: "Astuce: conservez un mot de passe unique et robuste.",
  });

  const text = [
    `Bonjour ${name || "ami solidaire"},`,
    "",
    "Pour reinitialiser votre mot de passe, ouvrez ce lien:",
    resetUrl,
    "",
    "Le lien expire dans 60 minutes.",
  ].join("\n");

  return deliverMail({ to, subject, text, html });
}

export async function sendVerificationDecisionEmail({
  to,
  name,
  status,
  reason,
}) {
  const subject =
    status === "APPROVED"
      ? `${appName()}: verification donneur approuvee`
      : `${appName()}: mise a jour de verification donneur`;

  const textLines = [
    `Bonjour ${name || "donneur"},`,
    "",
    status === "APPROVED"
      ? "Votre verification donneur est approuvee. Vous pouvez maintenant publier des dons."
      : "Votre demande de verification donneur n'a pas ete approuvee.",
  ];

  if (reason) {
    textLines.push("", `Motif: ${reason}`);
  }

  textLines.push("", "Merci pour votre engagement solidaire.");

  const html = renderEmailLayout({
    title: "Statut de verification donneur",
    subtitle:
      status === "APPROVED"
        ? "Bonne nouvelle: votre compte donneur est active."
        : "Votre verification a ete refusee pour le moment.",
    bodyHtml: `
      <p style="margin:0 0 12px;font-size:15px;">Bonjour ${escapeHtml(name || "donneur")},</p>
      <p style="margin:0 0 14px;font-size:15px;line-height:1.5;">
        ${
          status === "APPROVED"
            ? "Votre verification est completee. Vous pouvez partager des repas des maintenant."
            : "Votre verification n'a pas pu etre validee actuellement."
        }
      </p>
      ${reason ? `<p style="margin:0;font-size:14px;color:#7a2f2f;">Motif: ${escapeHtml(reason)}</p>` : ""}
    `,
    footerNote: "Pour toute question, contactez l'equipe de moderation.",
  });

  return deliverMail({
    to,
    subject,
    text: textLines.join("\n"),
    html,
  });
}

export async function sendRestaurantDecisionEmail({
  to,
  businessName,
  status,
  reason,
}) {
  const isApproved = status === "APPROVED" || status === "approved";
  const subject = isApproved
    ? `Votre restaurant est maintenant approuve`
    : `Mise a jour de votre demande d'inscription restaurant`;

  const safeName = escapeHtml(businessName || "Restaurant");
  const safeReason = reason ? escapeHtml(reason) : "";

  const bodyLines = isApproved
    ? [
        "Votre dossier a ete examine et approuve par notre equipe.",
        "Vous pouvez desormais vous connecter et publier des dons alimentaires.",
      ]
    : [
        "Votre dossier n'a pas pu etre valide pour le moment.",
        safeReason
          ? `Motif : ${safeReason}`
          : "Veuillez nous contacter pour plus d'informations.",
      ];

  const html = renderEmailLayout({
    title: isApproved ? "Restaurant approuve !" : "Demande non validee",
    subtitle: isApproved
      ? "Bienvenue sur la plateforme."
      : "Votre demande necessite une correction.",
    bodyHtml: `
      <p style="margin:0 0 12px;font-size:15px;">Bonjour ${safeName},</p>
      ${bodyLines.map((l) => `<p style="margin:0 0 10px;font-size:15px;line-height:1.5;">${l}</p>`).join("")}
    `,
    footerNote: "Pour toute question, contactez l'equipe de moderation.",
  });

  return deliverMail({
    to,
    subject,
    text: `${businessName},\n\n${bodyLines.join("\n")}`,
    html,
  });
}

export async function sendPhoneOtpSms({ phone, code }) {
  // If a real SMS provider (e.g. Twilio) is configured, send via HTTP.
  // For now we just log in development so the flow can be tested without credentials.
  if (process.env.NODE_ENV !== "production") {
    console.log(`[SMS-OTP] Phone: ${phone}  Code: ${code}`);
    return { delivered: false, skipped: true, devCode: code };
  }
  // Production: integrate your SMS provider here (Twilio, OVH SMS, etc.)
  // Example (Twilio):
  //   const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
  //   await client.messages.create({ body: `Votre code: ${code}`, from: TWILIO_FROM, to: phone });
  console.warn("[mailer] SMS provider not configured. Phone OTP not sent.");
  return { delivered: false, skipped: true };
}
