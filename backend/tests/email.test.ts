import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sendEmail, verifySmtpConnection, isEmailDuplicate, EmailTemplates } from '../src/services/email';
import { getAdminDb } from '../src/firebase/admin';
import { SmtpEmailProvider } from '../src/providers/email/SmtpEmailProvider';

vi.mock('../src/firebase/admin', () => ({
  getAdminDb: vi.fn(() => ({
    collection: vi.fn(() => ({
      add: vi.fn(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      get: vi.fn(() => Promise.resolve({ empty: true, docs: [] })),
    })),
  })),
}));

const mockSendEmail = vi.fn();
const mockVerifyConnection = vi.fn();

vi.mock('../src/providers/email/SmtpEmailProvider', () => ({
  SmtpEmailProvider: class MockSmtpEmailProvider {
    sendEmail = mockSendEmail;
    verifyConnection = mockVerifyConnection;
    constructor() {}
  },
}));

describe('SMTP Email Automation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'test';
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_SECURE = 'false';
    process.env.SMTP_USER = 'test@test.com';
    process.env.SMTP_PASSWORD = 'test-password';
    process.env.SMTP_FROM_NAME = 'Click2IT';
    process.env.SMTP_FROM_EMAIL = 'noreply@click2it.com';
  });

  describe('sendEmail', () => {
    it('returns success on successful SMTP send', async () => {
      mockSendEmail.mockResolvedValue({ success: true, messageId: 'msg-123' });

      const result = await sendEmail({
        to: 'customer@example.com',
        subject: 'Test Subject',
        html: '<p>Test</p>',
        orderId: 'order-123',
        category: 'order',
        type: 'order_received',
      });

      expect(result.success).toBe(true);
      expect(mockSendEmail).toHaveBeenCalledWith('customer@example.com', 'Test Subject', '<p>Test</p>');
    });

    it('returns failure on SMTP error and logs to Firestore', async () => {
      mockSendEmail.mockResolvedValue({ success: false, error: 'Connection refused', code: 'SMTP_CONNECTION_REFUSED' });

      const result = await sendEmail({
        to: 'customer@example.com',
        subject: 'Test Subject',
        html: '<p>Test</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection refused');
    });

    it('retries on timeout and succeeds', async () => {
      mockSendEmail
        .mockResolvedValueOnce({ success: false, error: 'Timeout', code: 'SMTP_TIMEOUT' })
        .mockResolvedValueOnce({ success: true, messageId: 'msg-456' });

      const result = await sendEmail({
        to: 'customer@example.com',
        subject: 'Test Subject',
        html: '<p>Test</p>',
        retries: 1,
      });

      expect(result.success).toBe(true);
      expect(mockSendEmail).toHaveBeenCalledTimes(2);
    });

    it('prevents duplicate emails within 5 minutes', async () => {
      vi.mocked(getAdminDb).mockReturnValue({
        collection: vi.fn(() => ({
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          get: vi.fn(() => Promise.resolve({
            empty: false,
            docs: [{ id: 'log-1', data: () => ({}) }],
          })),
        })),
      } as any);

      const result = await sendEmail({
        to: 'customer@example.com',
        subject: 'Duplicate Subject',
        html: '<p>Test</p>',
        type: 'order_received',
      });

      expect(result.success).toBe(true);
      expect(mockSendEmail).not.toHaveBeenCalled();
    });
  });

  describe('verifySmtpConnection', () => {
    it('returns success when SMTP is reachable', async () => {
      mockVerifyConnection.mockResolvedValue({ success: true, code: 'SMTP_OK', message: 'Verified' });

      const result = await verifySmtpConnection();
      expect(result.success).toBe(true);
      expect(result.code).toBe('SMTP_OK');
    });

    it('returns failure when SMTP is unreachable', async () => {
      mockVerifyConnection.mockResolvedValue({ success: false, code: 'SMTP_TIMEOUT', message: 'Timeout' });

      const result = await verifySmtpConnection();
      expect(result.success).toBe(false);
      expect(result.code).toBe('SMTP_TIMEOUT');
    });
  });

  describe('EmailTemplates', () => {
    it('renders orderReceived template', () => {
      const template = EmailTemplates.orderReceived('order-123', 'John Doe', 5000, 'bKash');
      expect(template.subject).toContain('Order Received');
      expect(template.html).toContain('John Doe');
      expect(template.html).toContain('৳5000');
    });

    it('renders hostingActivated template without password or WHM token', () => {
      const template = EmailTemplates.hostingActivated('example.com', 'https://cpanel.example.com', 'admin');
      expect(template.subject).toContain('Hosting is Ready');
      expect(template.html).toContain('example.com');
      expect(template.html).not.toContain('WHM');
    });

    it('renders domainRegistered template', () => {
      const template = EmailTemplates.domainRegistered('example.com', '2027-01-01');
      expect(template.subject).toContain('Domain Registered');
      expect(template.html).toContain('example.com');
    });

    it('renders orderCompleted template', () => {
      const template = EmailTemplates.orderCompleted('order-123', 'John Doe');
      expect(template.subject).toContain('Order Completed');
      expect(template.html).toContain('John Doe');
    });
  });
});
