import nodemailer from 'nodemailer';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromName: string;
  fromEmail: string;
}

export interface SmtpProviderError extends Error {
  code: string;
  statusCode?: number;
}

export class SmtpEmailProvider {
  private config: SmtpConfig;
  private transporter: nodemailer.Transporter | null = null;
  private requestTimeout: number;

  constructor(config: SmtpConfig, requestTimeout: number = 10000) {
    this.config = config;
    this.requestTimeout = requestTimeout;
  }

  private getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      const isGmail = (this.config.host && this.config.host.toLowerCase().includes('gmail')) ||
                      (this.config.user && this.config.user.toLowerCase().endsWith('@gmail.com'));
      
      const cleanPassword = (this.config.password || '').trim().replace(/\s+/g, '');

      if (isGmail) {
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: this.config.user.trim(),
            pass: cleanPassword,
          },
          connectionTimeout: this.requestTimeout,
          greetingTimeout: this.requestTimeout,
          socketTimeout: this.requestTimeout,
        }) as nodemailer.Transporter;
      } else {
        this.transporter = nodemailer.createTransport({
          host: this.config.host,
          port: this.config.port,
          secure: this.config.secure,
          auth: {
            user: this.config.user.trim(),
            pass: cleanPassword,
          },
          tls: {
            rejectUnauthorized: false,
          },
          connectionTimeout: this.requestTimeout,
          greetingTimeout: this.requestTimeout,
          socketTimeout: this.requestTimeout,
        }) as nodemailer.Transporter;
      }
    }
    return this.transporter;
  }

  async sendEmail(to: string, subject: string, html: string, attachments?: any[]): Promise<{ success: boolean; messageId?: string; error?: string; code?: string }> {
    if (!this.config.host || !this.config.user || !this.config.password) {
      const error = 'SMTP configuration is incomplete';
      console.warn(`${error}: host=${this.config.host}, user=${this.config.user}`);
      return { success: false, error, code: 'SMTP_CONFIG_MISSING' };
    }

    try {
      const transporter = this.getTransporter();
      
      const mailOptions = {
        from: `"${this.config.fromName}" <${this.config.fromEmail}>`,
        to,
        subject,
        html,
        attachments,
      };

      const info = await transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      console.error('SMTP Email Error details:', {
        code: error.code,
        message: error.message,
        response: error.response,
        responseCode: error.responseCode,
        command: error.command
      });
      return { 
        success: false, 
        error: error.message || 'Unknown SMTP error',
        code: error.code || 'SMTP_SEND_ERROR'
      };
    }
  }

  async verifyConnection(): Promise<{ success: boolean; code: string; message: string }> {
    try {
      const transporter = this.getTransporter();
      await transporter.verify();
      return {
        success: true,
        code: 'SMTP_OK',
        message: 'SMTP connection verified successfully',
      };
    } catch (error: any) {
      const code = this.classifyError(error);
      let message = error?.message || 'SMTP connection verification failed';
      if (message.includes('Invalid login') || message.includes('535') || message.includes('Username and Password not accepted')) {
        const isGmail = (this.config.host && this.config.host.toLowerCase().includes('gmail')) ||
                        (this.config.user && this.config.user.toLowerCase().endsWith('@gmail.com'));
        if (isGmail) {
          message = 'Gmail Authentication Failed: Please use a 16-character Google App Password (generated from myaccount.google.com/apppasswords), not your regular password.';
        } else {
          message = `Invalid Login (535): Incorrect username (${this.config.user}) or password for mail host ${this.config.host}.`;
        }
      }
      return {
        success: false,
        code,
        message,
      };
    }
  }

  private classifyError(error: any): string {
    const message = error?.message || '';
    if (message.includes('Invalid login') || message.includes('Authentication') || message.includes('535') || message.includes('Username and Password not accepted')) {
      return 'SMTP_AUTH_FAILED';
    }
    if (message.includes('ECONNREFUSED') || message.includes('ENOTFOUND')) {
      return 'SMTP_CONNECTION_REFUSED';
    }
    if (message.includes('ETIMEDOUT') || message.includes('timeout') || message.includes('ESOCKETTIMEDOUT')) {
      return 'SMTP_TIMEOUT';
    }
    if (message.includes('self-signed certificate') || message.includes('CERT_HAS_EXPIRED') || message.includes('unable to verify')) {
      return 'SMTP_TLS_ERROR';
    }
    if (message.includes('550') || message.includes('5.1.1')) {
      return 'SMTP_RECIPIENT_REJECTED';
    }
    return 'SMTP_UNKNOWN_ERROR';
  }
}
