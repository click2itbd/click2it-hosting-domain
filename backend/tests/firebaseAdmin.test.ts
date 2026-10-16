import { describe, it, expect, vi } from 'vitest';
import { validateServiceAccountStructure } from '../src/firebase/admin';

describe('Firebase Service Account Validation', () => {
  it('validates a correct service account JSON', () => {
    const valid = {
      type: 'service_account',
      project_id: 'my-project',
      private_key_id: 'key-id',
      private_key: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----\n',
      client_email: 'test@my-project.iam.gserviceaccount.com',
      client_id: '123',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/test',
    };
    expect(() => validateServiceAccountStructure(valid)).not.toThrow();
  });

  it('rejects null or non-object input', () => {
    expect(() => validateServiceAccountStructure(null)).toThrow('Invalid Firebase service account key format.');
    expect(() => validateServiceAccountStructure('string')).toThrow('Invalid Firebase service account key format.');
    expect(() => validateServiceAccountStructure(123)).toThrow('Invalid Firebase service account key format.');
  });

  it('rejects missing required fields', () => {
    const base = {
      type: 'service_account',
      project_id: 'my-project',
      private_key_id: 'key-id',
      private_key: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----\n',
      client_email: 'test@my-project.iam.gserviceaccount.com',
      client_id: '123',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/test',
    };

    expect(() => validateServiceAccountStructure({ ...base, type: '' })).toThrow();
    expect(() => validateServiceAccountStructure({ ...base, project_id: '' })).toThrow();
    expect(() => validateServiceAccountStructure({ ...base, private_key: '' })).toThrow();
    expect(() => validateServiceAccountStructure({ ...base, client_email: '' })).toThrow();
  });

  it('rejects wrong type', () => {
    const invalid = {
      type: 'user',
      project_id: 'my-project',
      private_key_id: 'key-id',
      private_key: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----\n',
      client_email: 'test@my-project.iam.gserviceaccount.com',
      client_id: '123',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/test',
    };
    expect(() => validateServiceAccountStructure(invalid)).toThrow('Invalid Firebase service account key format.');
  });

  it('rejects malformed private key', () => {
    const base = {
      type: 'service_account',
      project_id: 'my-project',
      private_key_id: 'key-id',
      private_key: 'not-a-real-key',
      client_email: 'test@my-project.iam.gserviceaccount.com',
      client_id: '123',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/test',
    };
    expect(() => validateServiceAccountStructure(base)).toThrow('Invalid Firebase service account key format.');
  });

  it('does not expose secret values in error output', () => {
    const secretJson = {
      type: 'service_account',
      project_id: 'secret-project',
      private_key_id: 'super-secret-key-id',
      private_key: 'SUPER_SECRET_KEY',
      client_email: 'secret@secret-project.iam.gserviceaccount.com',
      client_id: '999',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/secret',
    };

    expect(() => validateServiceAccountStructure(secretJson)).toThrow();
    try {
      validateServiceAccountStructure(secretJson);
    } catch (error: any) {
      expect(error.message).not.toContain('super-secret-key-id');
      expect(error.message).not.toContain('SUPER_SECRET_KEY');
      expect(error.message).not.toContain('secret@secret-project');
      expect(error.message).not.toContain('secret-project');
    }
  });
});
