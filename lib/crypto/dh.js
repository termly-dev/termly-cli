const crypto = require('crypto');

// Generate Diffie-Hellman keypair
function generateDHKeyPair() {
  const dh = crypto.createDiffieHellman(2048);
  const publicKey = dh.generateKeys();
  const privateKey = dh.getPrivateKey();

  return {
    dh,
    publicKey: publicKey.toString('base64'),
    privateKey: privateKey.toString('base64')
  };
}

// Compute shared secret from their public key
function computeSharedSecret(dh, theirPublicKeyBase64) {
  const theirPublicKey = Buffer.from(theirPublicKeyBase64, 'base64');
  const sharedSecret = dh.computeSecret(theirPublicKey);
  return sharedSecret;
}

// Derive AES key using HKDF
function deriveAESKey(sharedSecret) {
  const aesKey = crypto.hkdfSync(
    'sha256',
    sharedSecret,
    '', // salt (empty)
    'termly-session-key', // info
    32  // key length (256 bits for AES-256)
  );
  return aesKey;
}

// Generate key fingerprint for verification
function generateFingerprint(publicKey) {
  const hash = crypto.createHash('sha256')
    .update(Buffer.from(publicKey, 'base64'))
    .digest('hex');

  // Format as: A3:B2:C1:D4:E5:F6...
  return hash
    .substring(0, 24)
    .match(/.{2}/g)
    .join(':')
    .toUpperCase();
}

module.exports = {
  generateDHKeyPair,
  computeSharedSecret,
  deriveAESKey,
  generateFingerprint
};
