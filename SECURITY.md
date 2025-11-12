# Security Policy

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue in Termly CLI, please report it responsibly.

### How to Report

**For security vulnerabilities, please DO NOT open a public GitHub issue.**

Instead, please report security issues privately:

1. **GitHub Security Advisory** (preferred):
   - Go to https://github.com/termly-dev/termly-cli/security/advisories/new
   - Create a private security advisory
   - Provide detailed information about the vulnerability

2. **Email:**
   - Send to: hello@termly.dev
   - Include "SECURITY" in the subject line
   - Provide detailed steps to reproduce the issue

### What to Include

When reporting a vulnerability, please include:

- **Description** - Clear description of the vulnerability
- **Impact** - What could an attacker potentially do?
- **Steps to reproduce** - Detailed steps to verify the issue
- **Affected versions** - Which versions are impacted?
- **Proposed fix** - If you have suggestions

### Response Timeline

- **Initial response:** Within 48 hours
- **Status update:** Within 7 days
- **Fix timeline:** Depends on severity
  - Critical: 1-7 days (with forced update via version check)
  - High: 7-14 days
  - Medium: 14-30 days
  - Low: 30-90 days

### Security Updates

When security issues are fixed:
- We'll release a patch version immediately
- Update the CHANGELOG
- Credit the reporter (unless they prefer to remain anonymous)
- Publish a security advisory on GitHub
- **For critical issues:** Set minimum version on server to force all users to update

## Supported Versions

**We only support the latest version.**

| Version | Supported          |
| ------- | ------------------ |
| Latest (1.3.x)   | ✅ Yes    |
| Older versions   | ❌ No     |

**Important:** Termly CLI includes automatic version checking. If your version is outdated and has known security issues, the CLI will block startup and require you to update.

To update to the latest version:
```bash
npm update -g @termly-dev/cli
```

## Security Features

Termly CLI includes several security features:

### End-to-End Encryption
- **Algorithm:** AES-256-GCM (authenticated encryption)
- **Key Exchange:** Diffie-Hellman (2048-bit MODP group)
- **Key Derivation:** HKDF-SHA256
- **Session Keys:** Unique per session, never reused

### Zero-Knowledge Server
- Server cannot decrypt your data
- All encryption happens client-side (CLI and mobile app)
- Server only relays encrypted messages

### Fingerprint Verification
- Both CLI and mobile app display encryption fingerprints
- Users can verify they match to prevent MITM attacks
- Fingerprint: First 8 bytes of SHA-256(shared_secret)

### Version Enforcement
- CLI checks minimum supported version on startup
- Outdated versions are blocked from connecting
- Ensures users have latest security patches

### Session Isolation
- Each session uses unique encryption keys
- One mobile device per session (enforced)
- Sessions cannot interfere with each other

## Security Best Practices

When using Termly CLI:

1. **Always verify fingerprints** - Compare CLI and mobile fingerprints on first connection
2. **Keep CLI updated** - Run `npm update -g @termly-dev/cli` regularly
3. **Secure your machine** - CLI has access to your code and AI tools
4. **Use trusted networks** - Avoid public WiFi for sensitive work
5. **Review session list** - Run `termly status` to check active sessions
6. **Clean up stale sessions** - Run `termly cleanup` periodically

## Known Security Limitations

1. **Local Access** - Anyone with access to your machine can access the CLI
2. **PTY Output** - Terminal output is visible on the local machine
3. **No User Authentication** - CLI doesn't authenticate users (relies on pairing codes)
4. **WebSocket Connection** - Connection metadata (IP, timing) visible to server
5. **Node.js Dependencies** - Security depends on npm package ecosystem

## Cryptography Audit

Termly CLI's cryptography implementation:
- Uses standard Node.js crypto module
- Follows NIST recommendations for key sizes
- Implementation details: See [CRYPTO_SPEC.md](CRYPTO_SPEC.md)

**Status:** Not yet audited by third-party security firm.

We welcome security researchers to review our implementation.

## Responsible Disclosure

We follow responsible disclosure practices:
1. You report the issue privately
2. We confirm the issue and develop a fix
3. We release the fix
4. We publish the security advisory
5. You receive credit (if desired)

We commit to:
- Keeping you informed throughout the process
- Crediting you appropriately
- Not taking legal action against security researchers acting in good faith

## Bug Bounty

We don't currently have a formal bug bounty program, but we appreciate security research!

For significant findings, we're happy to:
- Credit you publicly (if desired)
- Send you Termly swag
- Buy you a coffee via Ko-fi

## Questions?

For security questions or concerns, contact: hello@termly.dev

For general support: https://github.com/termly-dev/termly-cli/issues

---

**Last Updated:** 2025-01-12
