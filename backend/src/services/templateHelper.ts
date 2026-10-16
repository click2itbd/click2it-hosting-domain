import { getAdminDb } from '../firebase/admin.js';

export async function getDynamicTemplate(
  templateId: string,
  vars: Record<string, string>,
  defaultSubject: string,
  defaultHtml: string
): Promise<{ subject: string; html: string }> {
  try {
    const db = getAdminDb();
    const tmplSnap = await db.collection('emailTemplates').doc(templateId).get();
    
    if (!tmplSnap.exists) {
      return { subject: defaultSubject, html: defaultHtml };
    }
    
    const data = tmplSnap.data() || {};
    
    let subject = data.subject || defaultSubject;
    let heading = data.heading || 'Notification';
    let badgeText = data.badgeText || 'Update';
    let bodyHtml = data.bodyHtml || '';
    let footerNote = data.footerNote || '';
    
    // Replace variables
    for (const [key, value] of Object.entries(vars)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      subject = subject.replace(regex, value || '');
      bodyHtml = bodyHtml.replace(regex, value || '');
      heading = heading.replace(regex, value || '');
    }
    
    const fromName = process.env.SMTP_FROM_NAME || 'Click2IT BD';
    const fromEmail = process.env.SMTP_FROM_EMAIL || 'info@click2itbd.com';
    
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
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e5e7eb;">
                <tr>
                  <td style="background: linear-gradient(135deg, #0a1628 0%, #1e3a8a 100%); padding: 30px 24px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">${fromName}</h1>
                    <p style="margin: 4px 0 0; color: #93c5fd; font-size: 13px;">${heading}</p>
                    <div style="margin-top: 14px; display: inline-block; background: rgba(34, 197, 94, 0.2); border: 1px solid #22c55e; border-radius: 30px; padding: 4px 14px;">
                      <span style="color: #4ade80; font-size: 12px; font-weight: 700; text-transform: uppercase;">${badgeText}</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px 28px; color: #1f2937; line-height: 1.6; font-size: 14px;">
                    ${bodyHtml}
                  </td>
                </tr>
                ${footerNote ? `
                <tr>
                  <td style="padding: 0 28px 20px;">
                    <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 0 8px 8px 0; font-size: 12px; color: #1e40af;">
                      ${footerNote}
                    </div>
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td style="background-color: #f8fafc; border-top: 1px solid #e5e7eb; padding: 20px 24px; text-align: center; font-size: 12px; color: #64748b;">
                    <p style="margin: 0; font-weight: 700; color: #0f172a;">${fromName}</p>
                    <p style="margin: 4px 0 0;">Email: ${fromEmail} | Web: click2itbd.com</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
    
    return { subject, html: finalHtml };
  } catch (error) {
    console.error('Error in getDynamicTemplate:', error);
    return { subject: defaultSubject, html: defaultHtml };
  }
}
