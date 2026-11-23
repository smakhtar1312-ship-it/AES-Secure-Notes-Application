const crypto = require('crypto');


function getKey() {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be set and be 64 hex characters (32 bytes)');
  }
  return Buffer.from(keyHex, 'hex');
}


function encrypt(text) {
  const key = getKey();
  const iv = crypto.randomBytes(16); // 128-bit IV
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    encryptedContent: encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}


function decrypt(encryptedContent, ivHex, authTagHex) {
  const key = getKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedContent, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

module.exports = { encrypt, decrypt };
