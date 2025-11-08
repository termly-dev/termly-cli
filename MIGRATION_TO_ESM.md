# Migration to ES Modules (ESM)

**Status:** Planned for future release (v2.0 or v1.5)
**Priority:** Medium
**Estimated effort:** 9-13 hours
**Breaking change:** No (requires Node.js >=18, already required)

---

## Executive Summary

This document outlines the plan to migrate Termly CLI from CommonJS to ES Modules (ESM). The migration is feasible, all dependencies support ESM, and the codebase is small enough (31 files) to make this a manageable task.

**Current status:** Project works well with CommonJS, no urgent need to migrate.
**Future benefit:** ESM is the modern standard, better performance, access to ESM-only packages.

---

## Dependency Compatibility Analysis

| Package | Current Version | Latest Version | ESM Support | Action Required |
|---------|----------------|----------------|-------------|-----------------|
| **axios** | ^1.6.0 | 1.x | ✅ Full (dual export) | None - already compatible |
| **chalk** | ^4.1.2 | 5.6.2 | ✅ ESM-only from v5 | **Upgrade to v5** |
| **commander** | ^11.0.0 | 12.x | ✅ Full (CJS compatible) | Optional upgrade |
| **conf** | ^10.2.0 | 15.0.2 | ✅ ESM-only from v11 | **Upgrade to v15** |
| **inquirer** | ^8.2.5 | 12.10.0 | ✅ Dual export from v10+ | **Upgrade to v12** |
| **node-pty** | @lydell/node-pty | 1.1.0 | ⚠️ CJS only | Works with ESM wrapper |
| **qrcode-terminal** | ^0.12.0 | 0.12.x | ✅ Dual export | None - already compatible |
| **semver** | ^7.7.3 | 7.x | ✅ Dual export | None - already compatible |
| **uuid** | ^9.0.0 | 11.x | ✅ Full | Optional upgrade to v11 |
| **ws** | ^8.14.0 | 8.x | ✅ Dual export | None - already compatible |

### Key Findings:

✅ **All dependencies support ESM**
✅ **node-pty works with ESM** (Node.js auto-wraps CJS modules)
✅ **Only 31 files** to migrate
✅ **Only 2 usages** of `__dirname`/`__filename` to replace
✅ **103 require()** statements to convert
✅ **30 module.exports** statements to convert

---

## Migration Plan

### Phase 1: Preparation (1-2 hours)

1. **Create feature branch:**
   ```bash
   git checkout -b feature/esm-migration
   ```

2. **Update dependencies:**
   ```bash
   npm install chalk@5 conf@15 inquirer@12 commander@12 uuid@11
   ```

3. **Add ESM flag to package.json:**
   ```json
   {
     "type": "module",
     "engines": {
       "node": ">=18.0.0"
     }
   }
   ```

4. **Verify project breaks as expected** (all require() will fail)

---

### Phase 2: Automated Conversion (2-3 hours)

#### Script 1: Convert require() to import

```bash
# Basic require to import conversion
find lib bin -name "*.js" -exec sed -i '' \
  's/const \(.*\) = require(\(.*\));/import \1 from \2;/g' {} \;

# Convert destructuring
find lib bin -name "*.js" -exec sed -i '' \
  's/const { \(.*\) } = require(\(.*\));/import { \1 } from \2;/g' {} \;
```

#### Script 2: Convert module.exports to export

```bash
# Convert module.exports =
find lib -name "*.js" -exec sed -i '' \
  's/module\.exports = /export default /g' {} \;

# Convert module.exports.foo =
find lib -name "*.js" -exec sed -i '' \
  's/module\.exports\.\([a-zA-Z0-9_]*\) =/export const \1 =/g' {} \;
```

#### Script 3: Add .js extensions to local imports

```bash
# Add .js to relative imports
find lib bin -name "*.js" -exec sed -i '' \
  "s/from '\(\.\.\/[^']*\)'/from '\1.js'/g" {} \;

find lib bin -name "*.js" -exec sed -i '' \
  "s/from '\(\.\/[^']*\)'/from '\1.js'/g" {} \;
```

**Note:** Automated scripts will cover ~80% of the work. Manual fixes needed for edge cases.

---

### Phase 3: Manual Refactoring (3-4 hours)

#### 3.1 Replace `__dirname` and `__filename` (2 occurrences)

**Before (CommonJS):**
```javascript
const path = require('path');
const configPath = path.join(__dirname, '..', 'config.json');
```

**After (ESM):**
```javascript
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const configPath = join(__dirname, '..', 'config.json');
```

**Alternative (shorter):**
```javascript
import { fileURLToPath } from 'url';
import { join } from 'path';

const configPath = join(
  fileURLToPath(new URL('..', import.meta.url)),
  'config.json'
);
```

#### 3.2 Fix JSON imports

**package.json imports** - 3 options:

**Option A: Import assertion (experimental but standard):**
```javascript
import packageJson from '../package.json' with { type: 'json' };
```

**Option B: Read + parse (most compatible):**
```javascript
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const packageJson = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../package.json', import.meta.url)),
    'utf8'
  )
);
```

**Option C: Create package-info.js (cleanest):**
```javascript
// package-info.js (generated or manual)
export const version = '1.2.0';
export const name = '@termly-dev/cli';

// cli.js
import { version, name } from '../package-info.js';
```

**Recommendation:** Use Option A for Node.js 18+, fallback to Option B if needed.

#### 3.3 Fix dynamic imports

**Before:**
```javascript
const toolName = 'claude-code';
const tool = require(`./tools/${toolName}.js`);
```

**After:**
```javascript
const toolName = 'claude-code';
const tool = await import(`./tools/${toolName}.js`);

// If it was export default:
const { default: tool } = await import(`./tools/${toolName}.js`);
```

#### 3.4 Handle node-pty (CJS module)

**Standard import (should work):**
```javascript
import pty from 'node-pty';
```

**Fallback if issues arise:**
```javascript
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pty = require('node-pty');
```

---

### Phase 4: Testing (2-3 hours)

#### 4.1 Smoke Tests

```bash
# Test basic commands
node bin/cli.js --version
node bin/cli.js config
node bin/cli.js tools
node bin/cli.js list

# Test with debug mode
DEBUG=1 node bin/cli.js start --debug

# Test global installation
npm link
termly --version
termly config
npm unlink
```

#### 4.2 Test All Commands

- [ ] `termly setup`
- [ ] `termly start` (with auto-detection)
- [ ] `termly start --ai claude-code`
- [ ] `termly status`
- [ ] `termly stop`
- [ ] `termly list`
- [ ] `termly tools`
- [ ] `termly config`
- [ ] `termly cleanup`

#### 4.3 Test Edge Cases

- [ ] Start session in directory with existing session
- [ ] Stop non-existent session
- [ ] Cleanup stale sessions
- [ ] WebSocket reconnection logic
- [ ] Session resume with catchup
- [ ] Encryption/decryption flow
- [ ] QR code generation
- [ ] Version check with outdated CLI

#### 4.4 Cross-Platform Testing

- [ ] macOS (Intel & Apple Silicon)
- [ ] Linux (Ubuntu/Debian)
- [ ] Windows 10+ (ConPTY)

#### 4.5 Package Testing

```bash
# Test package build
npm pack
tar -xzf termly-dev-cli-*.tgz
cd package
npm install -g .
termly --version
```

---

### Phase 5: Documentation & CI/CD (1 hour)

#### 5.1 Update Documentation

**CLAUDE.md:**
- Remove mentions of "CommonJS"
- Update code examples to ESM syntax
- Add ESM-specific notes (`.js` extensions required)

**README.md (if exists):**
- Update installation instructions
- Emphasize Node.js 18+ requirement
- Update code examples

#### 5.2 Update Configuration Files

**package.json:**
```json
{
  "type": "module",
  "engines": {
    "node": ">=18.0.0"
  }
}
```

**package.dev.json:**
```json
{
  "type": "module",
  "engines": {
    "node": ">=18.0.0"
  }
}
```

#### 5.3 CI/CD Updates

- Update GitHub Actions workflows (if any)
- Test on multiple Node.js versions (18, 20, 22)
- Update npm scripts if needed

---

## Potential Issues & Solutions

### Issue 1: `node-pty` is CJS-only

**Solution:**
```javascript
// ESM automatically wraps CJS modules - this works:
import pty from 'node-pty';

// Fallback if needed:
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pty = require('node-pty');
```

### Issue 2: Circular Dependencies

ESM is stricter about circular dependencies than CJS.

**Detection:**
```bash
npm install -g madge
madge --circular lib/
```

**Solution:**
- Extract shared code to separate module
- Use dependency injection
- Refactor to break the cycle

### Issue 3: Top-level await in entry point

ESM allows top-level `await`, but for CLI tools it's better to wrap:

**Recommended pattern:**
```javascript
#!/usr/bin/env node

async function main() {
  const config = await loadConfig();
  // ... rest of CLI logic
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
```

### Issue 4: Import extensions required

In ESM, **file extensions are mandatory** for local imports:

```javascript
// ❌ Wrong
import { foo } from './utils';

// ✅ Correct
import { foo } from './utils.js';
```

**Tip:** Use ESLint plugin `eslint-plugin-import` to catch this automatically.

---

## Rollback Plan

If migration fails or introduces critical bugs:

1. **Revert package.json:**
   ```bash
   git checkout main -- package.json package.dev.json
   ```

2. **Reinstall dependencies:**
   ```bash
   npm install
   ```

3. **Test production version:**
   ```bash
   node bin/cli.js --version
   ```

4. **Publish hotfix if needed:**
   ```bash
   npm version patch
   npm publish
   ```

---

## Benefits of Migration

### ✅ Advantages

1. **Future-proof:** ESM is the JavaScript standard (ES2015+)
2. **Better performance:** Static analysis enables tree-shaking
3. **Modern packages:** Access to ESM-only libraries (chalk v5+, conf v11+)
4. **Top-level await:** Simplifies async code
5. **Smaller bundles:** Better dead-code elimination
6. **IDE support:** Better autocomplete and type inference
7. **Browser compatibility:** Same module system for Node.js and browsers

### ⚠️ Considerations

1. **Breaking change:** Requires Node.js 18+ (already required, so no issue)
2. **Time investment:** 9-13 hours of work
3. **Testing overhead:** Need comprehensive tests to avoid regressions
4. **Learning curve:** Team needs to understand ESM differences
5. **Tooling updates:** May need to update build tools, linters, etc.

---

## When to Execute This Migration

### Recommended Triggers:

- [ ] **v2.0 release** - Major version bump allows breaking changes
- [ ] **After adding test suite** - Need safety net before refactoring
- [ ] **When chalk/conf updates needed** - If we need features from newer versions
- [ ] **Scheduled maintenance window** - 2-3 days of dedicated time
- [ ] **Low user impact period** - Between major feature releases

### Prerequisites:

- [ ] Basic test suite implemented (smoke tests minimum)
- [ ] CI/CD pipeline in place
- [ ] Backup of stable production version
- [ ] Team availability for quick fixes if needed

---

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Preparation | 1-2h | None |
| Automated conversion | 2-3h | Phase 1 complete |
| Manual refactoring | 3-4h | Phase 2 complete |
| Testing | 2-3h | Phase 3 complete |
| Documentation | 1h | Phase 4 complete |
| **Total** | **9-13h** | Sequential |

**Recommended schedule:**
- **Day 1 (4h):** Phases 1-2 (preparation + automated conversion)
- **Day 2 (5h):** Phase 3 (manual refactoring)
- **Day 3 (4h):** Phases 4-5 (testing + documentation)

---

## Checklist for Migration Day

### Pre-Migration
- [ ] Create feature branch `feature/esm-migration`
- [ ] Backup current stable version
- [ ] Notify team of migration in progress
- [ ] Review this document thoroughly

### During Migration
- [ ] Update dependencies
- [ ] Run automated conversion scripts
- [ ] Manual refactoring pass
- [ ] Fix all ESLint/linter errors
- [ ] Test all commands locally
- [ ] Test npm pack + install

### Post-Migration
- [ ] Cross-platform testing
- [ ] Update documentation
- [ ] Update CI/CD
- [ ] Create PR with detailed description
- [ ] Code review
- [ ] Merge to main
- [ ] Tag new version (v2.0.0 or v1.5.0)
- [ ] Publish to npm
- [ ] Monitor for issues

---

## References

- [Node.js ESM Documentation](https://nodejs.org/api/esm.html)
- [ES Modules in Node.js](https://nodejs.org/docs/latest-v18.x/api/esm.html)
- [Pure ESM Package Guide](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c)
- [CommonJS vs ESM](https://nodejs.org/api/packages.html#dual-commonjses-module-packages)

---

## Conclusion

**Migration is feasible and recommended for a future release.** All technical blockers have been analyzed, and the path forward is clear. The main barrier is time investment, not technical complexity.

**Recommended approach:** Schedule this for v2.0 or v1.5, after implementing a basic test suite. The current CommonJS implementation works fine, so there's no urgency.

---

**Document Version:** 1.0
**Last Updated:** 2025-01-08
**Author:** Claude (Anthropic)
**Next Review Date:** When planning v2.0 or v1.5 release
