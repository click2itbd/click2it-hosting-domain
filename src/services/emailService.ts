import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';

export interface EmailLog {
  id?: string;
  orderId: string;
  customerEmail: string;
  subject: string;
  content: string;
  sentAt: string;
  status: 'sent' | 'failed';
}

import { auth } from '../firebase';
import { resolveApiBaseUrl } from './apiClient';

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const cleanBase = resolveApiBaseUrl();
  let cleanPath = path.startsWith('/') ? path : `/${path}`;

  if (cleanBase.endsWith('/api') && cleanPath.startsWith('/api/')) {
    cleanPath = cleanPath.slice(4);
  }

  const url = `${cleanBase}${cleanPath}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (!headers['Authorization'] && typeof window !== 'undefined' && auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    } catch {
      // ignore
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export interface ServiceActivationDetails {
  domain?: string;
  serverIp?: string;
  controlPanelUrl?: string;
  isVps?: boolean;
  hostname?: string;
  os?: string;
  serverLocation?: string;
  rootPassword?: string;
  sshCommand?: string;
  specs?: any;
}

export const sendServiceActivationEmail = async (
  orderId: string, 
  customerEmail: string, 
  serviceDetails: ServiceActivationDetails
) => {
  const isVps = serviceDetails.isVps || Boolean(serviceDetails.hostname && serviceDetails.os);
  const subject = isVps
    ? `🚀 Your Cloud VPS is Live & Ready! - ${serviceDetails.hostname || serviceDetails.serverIp || 'Server'}`
    : `Your Service is Active! - ${serviceDetails.domain || 'Hosting'}`;
  
  let content = '';
  let html = '';

  if (isVps) {
    const sshCmd = serviceDetails.sshCommand || `ssh root@${serviceDetails.serverIp || 'YOUR_IP'}`;
    content = `
Hello,

Great news! Your Cloud VPS server has been deployed and is now live!

Server Details:
- Hostname: ${serviceDetails.hostname || 'N/A'}
- Primary IP: ${serviceDetails.serverIp || 'N/A'}
- Operating System: ${serviceDetails.os || 'Linux'}
- Datacenter: ${serviceDetails.serverLocation || 'Dhaka / Global'}
- Root Username: root
${serviceDetails.rootPassword ? `- Root Password: ${serviceDetails.rootPassword}` : ''}
- Quick SSH Connect: ${sshCmd}

You can also view your server details and management options directly from your Client Dashboard.

Thank you for choosing Click2IT!
    `.trim();

    html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%); padding: 24px; border-radius: 8px; color: #ffffff; text-align: center; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 22px;">🚀 Cloud VPS Server Activated</h2>
          <p style="margin: 6px 0 0; color: #c7d2fe; font-size: 13px;">Your dedicated virtual server instance is ready</p>
        </div>
        <p style="color: #374151; font-size: 15px;">Hello,</p>
        <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">Great news! Your dedicated Cloud VPS instance is online and assigned to your account. Below are your connection details:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 18px 0; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
          <tr><td style="padding: 10px 14px; font-weight: bold; color: #475569; width: 40%; border-bottom: 1px solid #e2e8f0;">Hostname</td><td style="padding: 10px 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;"><strong>${serviceDetails.hostname || 'N/A'}</strong></td></tr>
          <tr><td style="padding: 10px 14px; font-weight: bold; color: #475569; border-bottom: 1px solid #e2e8f0;">Server IP Address</td><td style="padding: 10px 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;"><strong style="color: #2563eb;">${serviceDetails.serverIp || 'N/A'}</strong></td></tr>
          <tr><td style="padding: 10px 14px; font-weight: bold; color: #475569; border-bottom: 1px solid #e2e8f0;">Operating System</td><td style="padding: 10px 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${serviceDetails.os || 'Linux'}</td></tr>
          <tr><td style="padding: 10px 14px; font-weight: bold; color: #475569; border-bottom: 1px solid #e2e8f0;">Datacenter Location</td><td style="padding: 10px 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${serviceDetails.serverLocation || 'Dhaka / Global'}</td></tr>
          <tr><td style="padding: 10px 14px; font-weight: bold; color: #475569; border-bottom: 1px solid #e2e8f0;">Root Username</td><td style="padding: 10px 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;"><code>root</code> (or Administrator)</td></tr>
          ${serviceDetails.rootPassword ? `<tr><td style="padding: 10px 14px; font-weight: bold; color: #475569; border-bottom: 1px solid #e2e8f0;">Root Password</td><td style="padding: 10px 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;"><code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${serviceDetails.rootPassword}</code></td></tr>` : ''}
        </table>

        <div style="background-color: #0f172a; color: #22c55e; padding: 14px; border-radius: 8px; font-family: monospace; font-size: 13px; margin: 16px 0;">
          <div style="color: #94a3b8; font-size: 11px; margin-bottom: 4px;"># SSH Command (Linux/macOS terminal or PowerShell):</div>
          ${sshCmd}
        </div>

        <p style="font-size: 13px; color: #6b7280;">You can log in to your <a href="https://click2it.bd/dashboard" style="color: #4f46e5; font-weight: bold;">Client Dashboard</a> to manage your services and invoices.</p>
        <p style="font-size: 14px; color: #374151; margin-top: 24px;">Thank you for choosing Click2IT!</p>
      </div>
    `;
  } else {
    content = `
Hello,

Great news! Your service for ${serviceDetails.domain || 'your recent order'} has been activated.

Here are your service details:
- Domain / Service: ${serviceDetails.domain || 'Active Service'}
- Server IP: ${serviceDetails.serverIp || 'Auto-Assigned'}
- Control Panel: ${serviceDetails.controlPanelUrl || 'https://cpanel.click2it.bd'}

Thank you for choosing Click2IT!
    `.trim();

    html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
        <div style="background: linear-gradient(135deg, #1e293b 0%, #2563eb 100%); padding: 24px; border-radius: 8px; color: #ffffff; text-align: center; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 22px; font-weight: 800;">🎉 Service Activated & Ready</h2>
          <p style="margin: 6px 0 0; color: #bfdbfe; font-size: 13px;">Your hosting & domain service is now fully active</p>
        </div>
        <p style="color: #334155; font-size: 15px; margin: 0 0 12px 0;">Hello,</p>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
          Great news! Your service for <strong>${serviceDetails.domain || 'your recent order'}</strong> is now fully configured and ready for use.
        </p>

        <table style="width: 100%; border-collapse: collapse; margin: 18px 0; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 13px;">
          <tr>
            <td style="padding: 10px 14px; font-weight: 600; color: #475569; width: 40%; border-bottom: 1px solid #e2e8f0;">Service / Domain</td>
            <td style="padding: 10px 14px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #e2e8f0;">${serviceDetails.domain || 'Hosting Package'}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0;">Server IP</td>
            <td style="padding: 10px 14px; color: #2563eb; font-weight: 700; border-bottom: 1px solid #e2e8f0;">${serviceDetails.serverIp || 'Auto-Assigned'}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; font-weight: 600; color: #475569;">Control Panel</td>
            <td style="padding: 10px 14px; color: #0f172a;"><a href="${serviceDetails.controlPanelUrl || 'https://cpanel.click2it.bd'}" style="color: #2563eb; font-weight: 600; text-decoration: none;" target="_blank">${serviceDetails.controlPanelUrl || 'Access Control Panel'}</a></td>
          </tr>
        </table>

        <div style="text-align: center; margin: 24px 0 16px 0;">
          <a href="https://click2it.bd/account/services" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">Manage in Client Dashboard</a>
        </div>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; font-size: 12px; color: #94a3b8; margin-top: 24px;">
          <p style="margin: 0 0 4px 0;">Click2IT BD &bull; Premium Hosting & Domain Solutions</p>
          <p style="margin: 0;">Need support? Contact us at info@click2itbd.com</p>
        </div>
      </div>
    `;
  }

  try {
    const response = await apiRequest<{ success: boolean }>('/api/send-email', {
      method: 'POST',
      body: JSON.stringify({
        to: customerEmail,
        subject,
        html: html || content.replace(/\n/g, '<br>'),
        orderId,
      }),
    });

    await addDoc(collection(db, 'emailLogs'), {
      orderId,
      customerEmail,
      recipient: customerEmail,
      subject,
      content,
      sentAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      status: response.success ? 'sent' : 'failed'
    });

    return response.success;
  } catch (err) {
    console.error('Failed to send email:', err);
    await addDoc(collection(db, 'emailLogs'), {
      orderId,
      customerEmail,
      recipient: customerEmail,
      subject,
      content,
      sentAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      status: 'failed'
    });
    return false;
  }
};

export const getEmailLogsForOrder = async (orderId: string): Promise<EmailLog[]> => {
  try {
    const q = query(
      collection(db, 'emailLogs'),
      where('orderId', '==', orderId)
    );
    const snapshot = await getDocs(q);
    const logs = snapshot.docs.map(doc => {
      const data = doc.data();
      let sentDate = new Date();
      const rawDate = data.sentAt || data.timestamp || data.createdAt;
      if (rawDate) {
        if (typeof rawDate?.toDate === 'function') {
          sentDate = rawDate.toDate();
        } else if (rawDate?.seconds) {
          sentDate = new Date(rawDate.seconds * 1000);
        } else {
          const parsed = new Date(rawDate);
          if (!isNaN(parsed.getTime())) sentDate = parsed;
        }
      }

      return {
        id: doc.id,
        orderId: data.orderId || orderId,
        customerEmail: data.customerEmail || data.recipient || data.to || '',
        subject: data.subject || 'Order Notification',
        content: data.content || data.body || (data.error ? `Error: ${data.error}` : (data.status === 'sent' ? 'Email notification sent successfully to customer.' : 'Delivery failed.')),
        sentAt: sentDate.toISOString(),
        status: data.status || 'sent',
      } as EmailLog;
    });
    return logs.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  } catch (err) {
    console.error('Failed to fetch email logs:', err);
    return [];
  }
};

export interface SendEmailResponse {
  success: boolean;
  error?: string;
  message?: string;
}

export const sendEmail = async ({
  to,
  subject,
  html,
  attachments,
  category,
  orderId,
}: {
  to: string;
  subject: string;
  html: string;
  attachments?: any[];
  category?: string;
  orderId?: string;
}): Promise<SendEmailResponse> => {
  try {
    const response = await apiRequest<{ success: boolean; error?: string; message?: string }>('/api/send-email', {
      method: 'POST',
      body: JSON.stringify({
        to,
        subject,
        html,
        attachments,
        category,
        orderId,
      }),
    });
    return { 
      success: response?.success ?? true,
      message: response?.message 
    };
  } catch (err: any) {
    console.error('Failed to send email:', err);
    return { 
      success: false, 
      error: err?.message || 'Email delivery failed. Please verify SMTP settings.' 
    };
  }
};

