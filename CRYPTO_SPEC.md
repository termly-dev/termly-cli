# Termly Cryptography Specification

This document specifies the exact cryptographic parameters used by Termly CLI for end-to-end encryption. These parameters **must match** on both CLI and mobile clients (iOS/Android) for successful key exchange and encrypted communication.

---

## Diffie-Hellman Key Exchange

### Standard Group: RFC 3526 Group 14 (2048-bit MODP)

**Why this group?**
- Industry-standard parameters defined in RFC 3526
- Available on all platforms (Node.js, iOS CryptoKit, Android, etc.)
- No need to transmit prime/generator parameters
- 2048-bit security level (equivalent to ~112-bit symmetric key)

### Node.js Implementation

```javascript
const crypto = require('crypto');

// Use standard DH group 'modp14' from RFC 3526
const dh = crypto.getDiffieHellman('modp14');
const publicKey = dh.generateKeys(); // Returns Buffer
const privateKey = dh.getPrivateKey(); // Returns Buffer
```

### RFC 3526 Group 14 Parameters

**Prime (p)**: 2048-bit
```
FFFFFFFF FFFFFFFF C90FDAA2 2168C234 C4C6628B 80DC1CD1
29024E08 8A67CC74 020BBEA6 3B139B22 514A0879 8E3404DD
EF9519B3 CD3A431B 302B0A6D F25F1437 4FE1356D 6D51C245
E485B576 625E7EC6 F44C42E9 A637ED6B 0BFF5CB6 F406B7ED
EE386BFB 5A899FA5 AE9F2411 7C4B1FE6 49286651 ECE45B3D
C2007CB8 A163BF05 98DA4836 1C55D39A 69163FA8 FD24CF5F
83655D23 DCA3AD96 1C62F356 208552BB 9ED52907 7096966D
670C354E 4ABC9804 F1746C08 CA18217C 32905E46 2E36CE3B
E39E772C 180E8603 9B2783A2 EC07A28F B5C55DF0 6F4C52C9
DE2BCBF6 95581718 3995497C EA956AE5 15D22618 98FA0510
15728E5A 8AACAA68 FFFFFFFF FFFFFFFF
```

**Generator (g)**: 2

### iOS Implementation (Swift + CryptoKit)

```swift
import CryptoKit

// RFC 3526 Group 14 parameters (hex strings converted to Data)
let prime = Data(hexString: "FFFFFFFF FFFFFFFF C90FDAA2...") // Full prime from above
let generator = 2

// Create DH private key
let privateKey = P256.KeyAgreement.PrivateKey()
let publicKey = privateKey.publicKey

// Compute shared secret with peer's public key
let sharedSecret = try! privateKey.sharedSecretFromKeyAgreement(with: peerPublicKey)
```

**Note**: iOS CryptoKit doesn't have built-in MODP groups, so you'll need to implement DH manually using BigInt or use a library like [SwiftDH](https://github.com/krzyzanowskim/CryptoSwift).

### Android Implementation (Kotlin)

```kotlin
import java.math.BigInteger
import javax.crypto.KeyAgreement
import javax.crypto.spec.DHParameterSpec
import java.security.KeyPairGenerator

// RFC 3526 Group 14 parameters
val prime = BigInteger("FFFFFFFF FFFFFFFF C90FDAA2...", 16) // Full prime
val generator = BigInteger.valueOf(2)

val dhParams = DHParameterSpec(prime, generator)
val keyPairGen = KeyPairGenerator.getInstance("DH")
keyPairGen.initialize(dhParams)

val keyPair = keyPairGen.generateKeyPair()
val publicKey = keyPair.public
val privateKey = keyPair.private

// Compute shared secret
val keyAgreement = KeyAgreement.getInstance("DH")
keyAgreement.init(privateKey)
keyAgreement.doPhase(peerPublicKey, true)
val sharedSecret = keyAgreement.generateSecret()
```

---

## Key Derivation (HKDF)

After computing the DH shared secret, derive an AES-256 key using HKDF-SHA256.

### Parameters

- **Algorithm**: HKDF-SHA256 (RFC 5869)
- **Input Key Material (IKM)**: DH shared secret (raw bytes)
- **Salt**: Empty (`""` or `null`)
- **Info**: `"termly-session-key"` (UTF-8 encoded string)
- **Output Length**: 32 bytes (256 bits)

### Node.js Implementation

```javascript
const crypto = require('crypto');

function deriveAESKey(sharedSecret) {
  const aesKey = crypto.hkdfSync(
    'sha256',              // hash function
    sharedSecret,          // input key material
    '',                    // salt (empty)
    'termly-session-key',  // info string
    32                     // output length in bytes
  );
  return aesKey; // Buffer of 32 bytes
}
```

### iOS Implementation (CryptoKit)

```swift
import CryptoKit

func deriveAESKey(from sharedSecret: SharedSecret) -> SymmetricKey {
    let info = "termly-session-key".data(using: .utf8)!

    let derivedKey = sharedSecret.hkdfDerivedSymmetricKey(
        using: SHA256.self,
        salt: Data(),           // Empty salt
        sharedInfo: info,
        outputByteCount: 32     // 256 bits
    )

    return derivedKey
}
```

### Android Implementation

```kotlin
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

fun deriveAESKey(sharedSecret: ByteArray): ByteArray {
    // HKDF implementation
    val salt = ByteArray(0) // Empty salt
    val info = "termly-session-key".toByteArray(Charsets.UTF_8)

    // HKDF-Extract
    val mac = Mac.getInstance("HmacSHA256")
    mac.init(SecretKeySpec(salt, "HmacSHA256"))
    val prk = mac.doFinal(sharedSecret)

    // HKDF-Expand
    mac.init(SecretKeySpec(prk, "HmacSHA256"))
    mac.update(info)
    mac.update(0x01.toByte())

    return mac.doFinal().copyOf(32) // 256 bits
}
```

---

## Symmetric Encryption (AES-256-GCM)

All terminal data is encrypted using AES-256-GCM (Galois/Counter Mode).

### Parameters

- **Algorithm**: AES-256-GCM
- **Key Size**: 256 bits (32 bytes)
- **IV Size**: 12 bytes (96 bits) - **must be random for each message**
- **Tag Size**: 16 bytes (128 bits) - authentication tag

### Message Format

Encrypted messages are transmitted as JSON:

```json
{
  "type": "output",
  "encrypted": true,
  "data": "base64(ciphertext + authTag)",
  "iv": "base64(12-byte IV)"
}
```

**Important**:
- `data` contains ciphertext concatenated with authentication tag
- `iv` is a random 12-byte initialization vector
- **Never reuse IVs** - generate new random IV for each message

### Node.js Implementation

```javascript
const crypto = require('crypto');

function encrypt(plaintext, aesKey) {
  // Generate random 12-byte IV
  const iv = crypto.randomBytes(12);

  // Create cipher
  const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);

  // Encrypt
  let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
  ciphertext += cipher.final('base64');

  // Get authentication tag
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext + authTag.toString('base64'),
    iv: iv.toString('base64')
  };
}

function decrypt(ciphertextWithTag, ivBase64, aesKey) {
  const iv = Buffer.from(ivBase64, 'base64');
  const combined = Buffer.from(ciphertextWithTag, 'base64');

  // Split ciphertext and auth tag
  const ciphertext = combined.slice(0, -16);
  const authTag = combined.slice(-16);

  // Create decipher
  const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, iv);
  decipher.setAuthTag(authTag);

  // Decrypt
  let plaintext = decipher.update(ciphertext, null, 'utf8');
  plaintext += decipher.final('utf8');

  return plaintext;
}
```

### iOS Implementation

```swift
import CryptoKit

func encrypt(plaintext: String, key: SymmetricKey) throws -> (ciphertext: Data, iv: Data) {
    let data = plaintext.data(using: .utf8)!

    // AES-GCM automatically generates random nonce (IV)
    let sealedBox = try AES.GCM.seal(data, using: key)

    return (
        ciphertext: sealedBox.ciphertext + sealedBox.tag,
        iv: sealedBox.nonce.withUnsafeBytes { Data($0) }
    )
}

func decrypt(ciphertext: Data, iv: Data, key: SymmetricKey) throws -> String {
    // Split ciphertext and tag
    let ciphertextOnly = ciphertext.prefix(ciphertext.count - 16)
    let tag = ciphertext.suffix(16)

    let nonce = try AES.GCM.Nonce(data: iv)
    let sealedBox = try AES.GCM.SealedBox(nonce: nonce, ciphertext: ciphertextOnly, tag: tag)

    let decryptedData = try AES.GCM.open(sealedBox, using: key)
    return String(data: decryptedData, encoding: .utf8)!
}
```

---

## Fingerprint Verification

To prevent man-in-the-middle attacks, both CLI and mobile clients display a fingerprint of the public key for manual verification.

### Parameters

- **Algorithm**: SHA-256
- **Input**: CLI's DH public key (raw bytes, same as transmitted)
- **Output**: First 24 hex characters (12 bytes) formatted with colons

### Node.js Implementation

```javascript
const crypto = require('crypto');

function generateFingerprint(publicKeyBase64) {
  const hash = crypto.createHash('sha256')
    .update(Buffer.from(publicKeyBase64, 'base64'))
    .digest('hex');

  // Take first 24 characters (12 bytes) and format with colons
  return hash
    .substring(0, 24)
    .match(/.{2}/g)
    .join(':')
    .toUpperCase();
}
```

### Example Output

```
A3:B2:C1:D4:E5:F6:12:34:56:78:9A:BC
```

### iOS/Android Implementation

```swift
// iOS
import CryptoKit

func generateFingerprint(publicKey: Data) -> String {
    let hash = SHA256.hash(data: publicKey)
    let hexString = hash.prefix(12)
        .map { String(format: "%02X", $0) }
        .joined(separator: ":")
    return hexString
}
```

```kotlin
// Android
import java.security.MessageDigest

fun generateFingerprint(publicKey: ByteArray): String {
    val digest = MessageDigest.getInstance("SHA-256")
    val hash = digest.digest(publicKey)

    return hash.take(12)
        .joinToString(":") { "%02X".format(it) }
}
```

### Verification Process

1. **CLI displays fingerprint** after generating DH keypair
2. **Mobile receives CLI's public key** via `pairing_complete` event
3. **Mobile computes fingerprint** from received public key
4. **Mobile displays fingerprint** in UI
5. **User manually verifies** both fingerprints match

**Security Note**: If fingerprints don't match, reject the connection - it may indicate a MITM attack.

---

## Public Key Format

Public keys are transmitted as **base64-encoded** raw bytes.

### Encoding

```javascript
// Node.js
const publicKey = dh.generateKeys(); // Buffer
const publicKeyBase64 = publicKey.toString('base64');
```

### Decoding

```javascript
// Node.js
const publicKeyBuffer = Buffer.from(publicKeyBase64, 'base64');
```

```swift
// iOS
let publicKeyData = Data(base64Encoded: publicKeyBase64)!
```

---

## Security Considerations

### Critical Requirements

1. **Use RFC 3526 Group 14 parameters** - Both sides must use identical prime and generator
2. **Generate random IVs** - Never reuse IVs, even accidentally
3. **Verify authentication tags** - Always check GCM auth tags before decrypting
4. **Destroy keys on disconnect** - Clear sensitive data from memory
5. **Use secure random** - Use cryptographically secure random number generators

### Key Rotation

Currently, keys are per-session and not rotated. For long-lived sessions, consider:
- Periodic key renegotiation (e.g., every 24 hours)
- Forward secrecy by generating new DH keypairs

### Known Limitations

- DH Group 14 (2048-bit) provides ~112-bit security level
- For higher security, consider upgrading to Group 15 (3072-bit) or Group 16 (4096-bit)
- GCM is susceptible to nonce reuse - ensure random IVs

---

## Testing Interoperability

### Test Vectors

**DH Shared Secret Test**:
1. CLI generates keypair with modp14
2. Mobile generates keypair with modp14
3. Both compute shared secret
4. Shared secrets must be identical (byte-for-byte)

**HKDF Test**:
```
Input: sharedSecret = 0x1234... (example)
Salt: (empty)
Info: "termly-session-key"
Output: 32-byte AES key

Expected output should match on both platforms.
```

**AES-GCM Test**:
```
Key: 0xABCD... (32 bytes)
IV: 0x1234... (12 bytes)
Plaintext: "Hello World"

Ciphertext + Tag should match on both platforms.
```

### Debugging Tips

1. **Log public keys** (in hex) and compare
2. **Log shared secrets** (only during development!) and compare
3. **Log derived AES keys** and compare
4. **Test with known vectors** from RFC test suites
5. **Use packet capture** to inspect WebSocket messages

---

## References

- **RFC 3526**: More Modular Exponential (MODP) Diffie-Hellman groups for Internet Key Exchange (IKE)
- **RFC 5869**: HMAC-based Extract-and-Expand Key Derivation Function (HKDF)
- **NIST SP 800-38D**: Recommendation for Block Cipher Modes of Operation: Galois/Counter Mode (GCM)

---

**Last Updated**: 2025-10-20
**Version**: 1.1
