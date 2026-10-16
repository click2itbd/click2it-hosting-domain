import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();
dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
export const config = {
    port: parseInt(process.env.PORT || '4001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    cors: {
        origins: (process.env.ALLOWED_ORIGINS || 'https://click2itbd.com,https://www.click2itbd.com,https://click2it.bd,https://www.click2it.bd,http://click2it.bd,http://www.click2it.bd,http://localhost:3000,http://localhost:3001,http://localhost:5173')
            .split(',')
            .map(o => o.trim()),
    },
    rateLimit: {
        windowMs: 15 * 60 * 1000,
        generalMax: process.env.NODE_ENV === 'production' ? 1000 : 10000,
        authMax: process.env.NODE_ENV === 'production' ? 20 : 100,
        sensitiveMax: process.env.NODE_ENV === 'production' ? 50 : 200,
    },
    bodyLimit: '10mb',
    requestTimeout: 15000,
    secrets: {
        expressApiKey: process.env.EXPRESS_API_KEY,
        geminiApiKey: process.env.GEMINI_API_KEY,
        whmApiType: process.env.WHM_API_TYPE || 'cpanel',
        whmUrl: process.env.WHM_URL || process.env.WHM_API_URL,
        whmApiUrl: process.env.WHM_URL || process.env.WHM_API_URL,
        whmApiToken: process.env.WHM_API_TOKEN || process.env.WHM_API_KEY,
        whmApiKey: process.env.WHM_API_TOKEN || process.env.WHM_API_KEY,
        whmUsername: (process.env.WHM_USERNAME || 'root').trim(),
        whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN,
        whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
        manualPaymentSecret: process.env.MANUAL_PAYMENT_SECRET,
        manualBikashNumber: process.env.MANUAL_BIKASH_NUMBER,
        firebaseServiceAccountKey: process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
    },
    smtp: {
        host: process.env.SMTP_HOST || '',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER || '',
        password: process.env.SMTP_PASSWORD || '',
        fromName: process.env.SMTP_FROM_NAME || 'Click2IT',
        fromEmail: process.env.SMTP_FROM_EMAIL || 'noreply@click2itbd.com',
    },
    cloudlinux: {
        enabled: process.env.CLOUDLINUX_ENABLED || 'false',
        apiUrl: process.env.CLOUDLINUX_API_URL || '',
        apiToken: process.env.CLOUDLINUX_API_TOKEN || '',
        partnerLogin: process.env.CLOUDLINUX_PARTNER_LOGIN || '',
        secretKey: process.env.CLOUDLINUX_SECRET_KEY || '',
    },
};
export function validateEnvironment() {
    const missing = [];
    if (!config.secrets.whmApiToken && !config.secrets.whmApiKey) {
        missing.push('WHM_API_TOKEN');
    }
    if (!config.secrets.whmApiUrl) {
        missing.push('WHM_API_URL');
    }
    if (!process.env.OPENPROVIDER_USERNAME || !process.env.OPENPROVIDER_PASSWORD) {
        missing.push('OPENPROVIDER_USERNAME / OPENPROVIDER_PASSWORD');
    }
    if (missing.length > 0) {
        console.warn('Missing recommended environment variables:');
        missing.forEach(name => console.warn(`  - ${name}`));
        console.warn('Some features may not work without these variables.');
    }
    const firebaseKey = config.secrets.firebaseServiceAccountKey?.trim();
    if (firebaseKey) {
        try {
            let parsed;
            if (firebaseKey.endsWith('.json') || firebaseKey.startsWith('.') || firebaseKey.includes('/') || firebaseKey.includes('\\')) {
                const candidatePaths = [
                    path.isAbsolute(firebaseKey) ? firebaseKey : path.resolve(process.cwd(), firebaseKey),
                    path.resolve(__dirname, '..', '..', firebaseKey),
                    path.resolve(__dirname, '..', '..', '..', firebaseKey),
                ];
                const foundPath = candidatePaths.find(p => fs.existsSync(p));
                if (foundPath) {
                    const fileContent = fs.readFileSync(foundPath, 'utf8');
                    parsed = JSON.parse(fileContent);
                }
                else {
                    // File path provided but file not on disk; fallback to ADC in Cloud environment
                    return;
                }
            }
            else {
                parsed = JSON.parse(firebaseKey);
            }
            if (!parsed || typeof parsed !== 'object') {
                console.warn('[Config] FIREBASE_SERVICE_ACCOUNT_KEY is not a valid JSON object.');
            }
            else if (parsed.type !== 'service_account') {
                console.warn('[Config] FIREBASE_SERVICE_ACCOUNT_KEY has invalid type field.');
            }
            else if (!parsed.project_id || !parsed.private_key || !parsed.client_email) {
                console.warn('[Config] FIREBASE_SERVICE_ACCOUNT_KEY is missing required fields.');
            }
        }
        catch {
            console.warn('[Config] FIREBASE_SERVICE_ACCOUNT_KEY check encountered an issue; falling back to default Cloud credentials.');
        }
    }
}
