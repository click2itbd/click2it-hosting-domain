import { getAdminDb } from '../firebase/admin.js';

export interface DynamicTemplateResult {
  subject: string;
  html: string;
  isActive: boolean;
}

export async function getDynamicTemplate(
  templateId: string,
  vars: Record<string, string>,
  defaultSubject: string,
  defaultHtml: string
): Promise<DynamicTemplateResult> {
  try {
    const db = getAdminDb();
    const tmplSnap = await db.collection('emailTemplates').doc(templateId).get();
    
    if (!tmplSnap.exists) {
      return { subject: defaultSubject, html: defaultHtml, isActive: true };
    }
    
    const data = tmplSnap.data() || {};
    const isActive = data.isActive !== false;

    let subject = data.subject || defaultSubject;
    let heading = data.heading || 'Notification';
    let badgeText = data.badgeText || 'Update';
    let rawBody = data.bodyHtml || data.body || '';
    let footerNote = data.footerNote !== undefined ? data.footerNote : '';
    
    // If rawBody is completely empty, fall back to defaultHtml
    if (!rawBody && defaultHtml) {
      return { subject, html: defaultHtml, isActive };
    }

    // Build comprehensive aliases for variables (case-insensitive & snake/camelCase)
    const varMap: Record<string, string> = {};
    for (const [k, v] of Object.entries(vars)) {
      const val = v !== undefined && v !== null ? String(v) : '';
      varMap[k.toLowerCase()] = val;
      varMap[k.toLowerCase().replace(/_/g, '')] = val;
    }

    const replacePlaceholders = (text: string): string => {
      if (!text) return '';
      return text.replace(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g, (match, p1) => {
        const lowerKey = p1.toLowerCase();
        const compactKey = lowerKey.replace(/_/g, '');
        if (varMap[lowerKey] !== undefined) return varMap[lowerKey];
        if (varMap[compactKey] !== undefined) return varMap[compactKey];
        return match;
      });
    };

    subject = replacePlaceholders(subject);
    heading = replacePlaceholders(heading);
    badgeText = replacePlaceholders(badgeText);
    footerNote = replacePlaceholders(footerNote);

    let bodyFormatted = replacePlaceholders(rawBody);

    // If the body is plain text (does not contain HTML paragraph or div or table tags), convert newlines
    if (!bodyFormatted.includes('<p>') && !bodyFormatted.includes('<div>') && !bodyFormatted.includes('<table>')) {
      bodyFormatted = bodyFormatted
        .split(/\n\s*\n/)
        .map(p => `<p style="margin: 0 0 14px 0; line-height: 1.6; color: #334155; font-size: 14px;">${p.replace(/\n/g, '<br/>')}</p>`)
        .join('');
    }

    // Read site branding
    let fromName = process.env.SMTP_FROM_NAME || 'Click2IT';
    let fromEmail = process.env.SMTP_FROM_EMAIL || 'info@click2it.bd';
    try {
      const siteSnap = await db.collection('settings').doc('site').get();
      if (siteSnap.exists) {
        const sData = siteSnap.data() || {};
        if (sData.mailFromName) fromName = sData.mailFromName;
        if (sData.mailFromAddress) fromEmail = sData.mailFromAddress;
      }
    } catch {}

    const finalHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 25px 10px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 620px; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
                <tr>
                  <td style="background: linear-gradient(135deg, #0a1628 0%, #1e3a8a 100%); padding: 30px 24px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">${fromName}</h1>
                    <p style="margin: 4px 0 0; color: #93c5fd; font-size: 13px;">${heading}</p>
                    ${badgeText ? `
                    <div style="margin-top: 14px; display: inline-block; background: rgba(34, 197, 94, 0.2); border: 1px solid #22c55e; border-radius: 30px; padding: 4px 14px;">
                      <span style="color: #4ade80; font-size: 12px; font-weight: 700; text-transform: uppercase;">${badgeText}</span>
                    </div>` : ''}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 26px 28px; color: #1f2937; line-height: 1.6; font-size: 14px;">
                    ${bodyFormatted}
                  </td>
                </tr>
                ${footerNote ? `
                <tr>
                  <td style="padding: 0 28px 22px;">
                    <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 0 8px 8px 0; font-size: 12px; color: #1e40af;">
                      ${footerNote}
                    </div>
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 12px; color: #64748b;">
                    <p style="margin: 0; font-weight: 700; color: #0f172a;">${fromName} BD</p>
                    <p style="margin: 4px 0 0;">Need support? Email: ${fromEmail} | Web: click2it.bd</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
    
    return { subject, html: finalHtml, isActive };
  } catch (error) {
    console.error('Error in getDynamicTemplate:', error);
    return { subject: defaultSubject, html: defaultHtml, isActive: true };
  }
}
