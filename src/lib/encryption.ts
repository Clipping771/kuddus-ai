import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Gets the encryption key from environment variables.
 * Falls back to a dummy key in development if missing (NOT secure for production).
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || 'dummy_dev_key_must_be_32_bytes_long_123';
  
  // If the secret is hex string (like the one we generated), parse it as hex
  if (secret.length === 64 && /^[0-9a-f]+$/i.test(secret)) {
    return Buffer.from(secret, 'hex');
  }
  
  // Otherwise, ensure it's exactly 32 bytes by hashing it if it's too long/short
  if (Buffer.from(secret).length !== KEY_LENGTH) {
    return crypto.createHash('sha256').update(String(secret)).digest();
  }
  
  return Buffer.from(secret);
}

/**
 * Encrypts a plaintext string (e.g., API Key) securely using AES-256-GCM.
 * Format: iv:salt:tag:encryptedText
 */
export function encryptText(text: string): string {
  if (!text) return '';
  
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = crypto.pbkdf2Sync(getEncryptionKey(), salt, 100000, KEY_LENGTH, 'sha256');
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${salt.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts an encrypted string back to plaintext.
 */
export function decryptText(encryptedText: string): string {
  if (!encryptedText) return '';
  
  // If it doesn't look like our encrypted format, maybe it's an old plaintext key
  if (!encryptedText.includes(':') || encryptedText.split(':').length !== 4) {
    return encryptedText;
  }
  
  try {
    const [ivHex, saltHex, tagHex, contentHex] = encryptedText.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const salt = Buffer.from(saltHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const content = Buffer.from(contentHex, 'hex');
    
    const key = crypto.pbkdf2Sync(getEncryptionKey(), salt, 100000, KEY_LENGTH, 'sha256');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(content as any, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    // Return original string as fallback in case it was somehow stored differently 
    // or if the key changed (so the user doesn't just crash, though the key won't work)
    return '';
  }
}
