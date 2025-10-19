const crypto = require('crypto');

// Encrypt plaintext using AES-256-GCM
function encrypt(plaintext, key) {
  const iv = crypto.randomBytes(12); // GCM standard IV size
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let ciphertext = cipher.update(plaintext, 'utf8');
  ciphertext = Buffer.concat([ciphertext, cipher.final()]);

  const authTag = cipher.getAuthTag();

  // Combine ciphertext and auth tag
  const combined = Buffer.concat([ciphertext, authTag]);

  return {
    ciphertext: combined.toString('base64'),
    iv: iv.toString('base64')
  };
}

// Decrypt ciphertext using AES-256-GCM
function decrypt(encryptedDataBase64, ivBase64, key) {
  const combined = Buffer.from(encryptedDataBase64, 'base64');
  const iv = Buffer.from(ivBase64, 'base64');

  // Extract auth tag (last 16 bytes)
  const authTag = combined.slice(-16);
  const ciphertext = combined.slice(0, -16);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let plaintext = decipher.update(ciphertext);
  plaintext = Buffer.concat([plaintext, decipher.final()]);

  return plaintext.toString('utf8');
}

module.exports = {
  encrypt,
  decrypt
};
