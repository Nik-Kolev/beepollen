import { OWNER_PHONE, SITE_URL } from "@/lib/site";

export const EMAIL_DESIGNS = ["A", "B"] as const;
export type EmailDesign = (typeof EMAIL_DESIGNS)[number];

export const DEFAULT_EMAIL_DESIGN: EmailDesign = "A";

export const EMAIL_COLOR = {
  ground: "#f6edde",
  surface: "#ffffff",
  ink: "#1d1712",
  inkSoft: "#5c534d",
  line: "#dbd5ca",
  footer: "#e2ceb1",
  action: "#ab4400",
  bee: "#f1c035",
} as const;

const FONT = "Roboto, 'Segoe UI', Arial, sans-serif";

const HEAD_FONT = "Georgia, 'Times New Roman', serif";

const SHOP_NAME = "Пчелни продукти Д & Н Димитрови";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type EmailContent = {
  preheader: string;
  heading: string;
  bodyHtml: string;
  toOwner?: boolean;
};

function brand(align: "left" | "center", subtitle: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="${align}">
  <tr>
    <td style="vertical-align:middle;padding-right:12px;">
      <img src="${SITE_URL}/email/bee.png" width="56" height="48" alt="" style="display:block;border:0;">
    </td>
    <td style="vertical-align:middle;font-family:${HEAD_FONT};color:${EMAIL_COLOR.ink};">
      <div style="font-size:20px;font-weight:bold;line-height:1;">Д <span style="color:${EMAIL_COLOR.action};font-style:italic;">&amp;</span> Н Димитрови</div>
      <div style="font-family:${FONT};font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${subtitle};margin-top:4px;">пчелни продукти</div>
    </td>
  </tr>
</table>`;
}

function contact(content: EmailContent, link: string) {
  if (content.toOwner) return "";

  return `Въпроси? Обадете се на <a href="${OWNER_PHONE.href}" style="color:${link};">${OWNER_PHONE.display}</a> или отговорете на този имейл.<br>`;
}

function shell(design: EmailDesign, content: EmailContent, inner: string) {
  return `<!doctype html>
<html lang="bg">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(content.heading)}</title>
</head>
<body style="margin:0;padding:0;background:${design === "A" ? EMAIL_COLOR.ground : EMAIL_COLOR.surface};">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(content.preheader)}</div>
${inner}
</body>
</html>`;
}

function designA(content: EmailContent) {
  return shell(
    "A",
    content,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${EMAIL_COLOR.ground};">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <!--[if mso]><table role="presentation" width="560" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
        <tr>
          <td style="padding:0 8px 16px;">${brand("left", EMAIL_COLOR.inkSoft)}</td>
        </tr>
        <tr>
          <td style="background:${EMAIL_COLOR.surface};border:1px solid ${EMAIL_COLOR.line};border-radius:12px;padding:28px 24px;font-family:${FONT};font-size:16px;line-height:1.5;color:${EMAIL_COLOR.ink};">
            <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:${EMAIL_COLOR.ink};">${escapeHtml(content.heading)}</h1>
            ${content.bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 8px 0;font-family:${FONT};font-size:13px;line-height:1.5;color:${EMAIL_COLOR.inkSoft};">
            ${contact(content, EMAIL_COLOR.action)}
            <a href="${SITE_URL}" style="color:${EMAIL_COLOR.inkSoft};">${SHOP_NAME}</a>
          </td>
        </tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td>
  </tr>
</table>`,
  );
}

function designB(content: EmailContent) {
  return shell(
    "B",
    content,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="center" style="background:${EMAIL_COLOR.bee};padding:20px 12px;">${brand("center", EMAIL_COLOR.ink)}</td>
  </tr>
  <tr>
    <td align="center" style="padding:28px 12px;">
      <!--[if mso]><table role="presentation" width="560" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
        <tr>
          <td style="font-family:${FONT};font-size:16px;line-height:1.5;color:${EMAIL_COLOR.ink};">
            <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:${EMAIL_COLOR.action};font-family:${HEAD_FONT};">${escapeHtml(content.heading)}</h1>
            ${content.bodyHtml}
          </td>
        </tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td>
  </tr>
  <tr>
    <td align="center" style="background:${EMAIL_COLOR.footer};padding:20px 12px;font-family:${FONT};font-size:13px;line-height:1.5;color:${EMAIL_COLOR.ink};">
      ${contact(content, EMAIL_COLOR.ink)}
      <a href="${SITE_URL}" style="color:${EMAIL_COLOR.ink};">${SHOP_NAME}</a>
    </td>
  </tr>
</table>`,
  );
}

export function renderLayout(design: EmailDesign, content: EmailContent) {
  return design === "A" ? designA(content) : designB(content);
}

export function textFooter() {
  return `Въпроси? Обадете се на ${OWNER_PHONE.display} или отговорете на този имейл.\n${SHOP_NAME}\n${SITE_URL}`;
}
