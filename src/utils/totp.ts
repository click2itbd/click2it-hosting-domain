/**
 * Whitelabeled TOTP (RFC 6238) Generator and Verifier
 * Implemented using native Web Crypto API (crypto.subtle)
 */

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Decodes a Base32 string into an ArrayBuffer
 */
function base32ToBuffer(base32Str: string): Uint8Array {
  const cleanStr = base32Str.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  const length = cleanStr.length;
  let bits = 0;
  let value = 0;
  let index = 0;
  const output = new Uint8Array(Math.floor((length * 5) / 8));

  for (let i = 0; i < length; i++) {
    const charIndex = BASE32_CHARS.indexOf(cleanStr[i]);
    if (charIndex === -1) continue;
    value = (value << 5) | charIndex;
    bits += 5;

    if (bits >= 8) {
      output[index++] = (value >>> (bits - 8)) & 255;
      bits -= 8;
    }
  }

  return output.slice(0, index);
}

/**
 * Encodes Uint8Array bytes to Base32 string
 */
function bufferToBase32(bytes: Uint8Array): string {
  let result = '';
  let value = 0;
  let bits = 0;

  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;

    while (bits >= 5) {
      result += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    result += BASE32_CHARS[(value << (5 - bits)) & 31];
  }

  return result;
}

/**
 * Generates a random Base32 TOTP secret key (16 bytes = 128 bits)
 */
export function generateTotpSecret(byteLength: number = 20): string {
  const randomBytes = new Uint8Array(byteLength);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(randomBytes);
  } else {
    for (let i = 0; i < byteLength; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return bufferToBase32(randomBytes);
}

/**
 * Computes 6-digit TOTP code for a given secret and counter timestamp
 */
export async function generateTotpCode(secretBase32: string, timeStepWindow: number = 30): Promise<string> {
  const secretKeyBytes = base32ToBuffer(secretBase32);
  const timeSeconds = Math.floor(Date.now() / 1000);
  const counter = Math.floor(timeSeconds / timeStepWindow);

  // Buffer for counter as 8-byte big-endian integer
  const counterBuffer = new ArrayBuffer(8);
  const counterView = new DataView(counterBuffer);
  counterView.setUint32(0, 0, false);
  counterView.setUint32(4, counter, false);

  // Import HMAC key using Web Crypto
  const key = await crypto.subtle.importKey(
    'raw',
    secretKeyBytes,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, counterBuffer);
  const hmac = new Uint8Array(signature);

  // Dynamic Truncation (RFC 4226)
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = (binary % 1000000).toString();
  return otp.padStart(6, '0');
}

/**
 * Verifies a 6-digit TOTP code with time window tolerance (±1 step = ±30 seconds)
 */
export async function verifyTotpCode(
  secretBase32: string,
  userToken: string,
  toleranceSteps: number = 1
): Promise<boolean> {
  if (!secretBase32 || !userToken) return false;
  const cleanToken = userToken.trim().replace(/\s+/g, '');
  if (cleanToken.length !== 6 || !/^\d{6}$/.test(cleanToken)) {
    return false;
  }

  const timeSeconds = Math.floor(Date.now() / 1000);
  const currentStep = Math.floor(timeSeconds / 30);

  for (let i = -toleranceSteps; i <= toleranceSteps; i++) {
    const step = currentStep + i;
    const counterBuffer = new ArrayBuffer(8);
    const counterView = new DataView(counterBuffer);
    counterView.setUint32(0, 0, false);
    counterView.setUint32(4, step, false);

    try {
      const secretKeyBytes = base32ToBuffer(secretBase32);
      const key = await crypto.subtle.importKey(
        'raw',
        secretKeyBytes,
        { name: 'HMAC', hash: 'SHA-1' },
        false,
        ['sign']
      );

      const signature = await crypto.subtle.sign('HMAC', key, counterBuffer);
      const hmac = new Uint8Array(signature);

      const offset = hmac[hmac.length - 1] & 0x0f;
      const binary =
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);

      const otp = (binary % 1000000).toString().padStart(6, '0');

      if (otp === cleanToken) {
        return true;
      }
    } catch {
      // ignore
    }
  }

  return false;
}

/**
 * Builds Whitelabeled otpauth:// URI
 */
export function buildWhitelabeledTotpUri(
  email: string,
  secretBase32: string,
  brandName: string = 'CLICK2IT BD'
): string {
  const encodedBrand = encodeURIComponent(brandName);
  const encodedEmail = encodeURIComponent(email || 'admin@click2it.bd');
  return `otpauth://totp/${encodedBrand}:${encodedEmail}?secret=${secretBase32}&issuer=${encodedBrand}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Generates Whitelabeled SVG QR Code string Data URL
 */
export function generateQrCodeSvgDataUrl(otpAuthUri: string): string {
  // Generate a simple high-contrast QR Matrix data representation using Google Chart API / SVG fallback or pure SVG path
  const encodedUri = encodeURIComponent(otpAuthUri);
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedUri}&qzone=1&margin=0`;
}

/**
 * Generates 8 random single-use backup recovery codes
 */
export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  for (let i = 0; i < count; i++) {
    let code = '';
    for (let j = 0; j < 8; j++) {
      if (j === 4) code += '-';
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    codes.push(code);
  }
  return codes;
}
