/** Escapes user-provided values before they are placed in email HTML. */
export const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const button = (url: string, label: string) => `
  <p style="text-align:center;margin:32px 0;">
    <a href="${url}" style="background:#0f766e;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">
      ${label}
    </a>
  </p>
  <p style="font-size:13px;color:#6b7280;">If the button doesn't work, copy this link into your browser:<br />
    <a href="${url}" style="color:#0f766e;word-break:break-all;">${url}</a>
  </p>`;

export const layout = (title: string, body: string) => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background:#0f766e;padding:20px 32px;color:#ffffff;font-size:20px;font-weight:700;">
                Real Estate
              </td>
            </tr>
            <tr>
              <td style="padding:32px;font-size:15px;line-height:1.6;">
                <h2 style="margin-top:0;">${title}</h2>
                ${body}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;background:#f9fafb;font-size:12px;color:#6b7280;text-align:center;">
                You are receiving this email because you have an account with Real Estate.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
