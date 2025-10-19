const crypto = require('crypto');

// Generate Diffie-Hellman keypair using RFC 3526 Group 14 (2048-bit MODP)
// This ensures compatibility with iOS and other clients using the same standard group
function generateDHKeyPair() {
  // Use standard DH group 'modp14' from RFC 3526
  // This provides the same prime and generator on all platforms
  const dh = crypto.getDiffieHellman('modp14');
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
// Both CLI and mobile must use the same derivation parameters for compatibility
function deriveAESKey(sharedSecret) {
  const aesKey = crypto.hkdfSync(
    'sha256',
    sharedSecret,
    '', // salt (empty)
    'termly-session-key', // info - must match on iOS
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
