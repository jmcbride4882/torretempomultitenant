# Security Audit Baseline Report

**Generated:** 2026-01-29 18:45 UTC  
**Project:** Torre Tempo V1  
**Audit Tool:** npm audit v10.x  
**Baseline Status:** Initial security assessment before updates

---

## Executive Summary

Current security posture shows **21 total vulnerabilities** across the dependency tree. The majority are moderate severity with 4 high-severity issues requiring immediate attention. No critical vulnerabilities detected.

### Vulnerability Counts by Severity

| Severity | Count | Status |
|----------|-------|--------|
| **Critical** | 0 | ✅ None |
| **High** | 4 | ⚠️ Requires attention |
| **Moderate** | 13 | ⚠️ Should be addressed |
| **Low** | 4 | ℹ️ Monitor |
| **Total** | **21** | |

---

## High Severity Vulnerabilities (4)

These require immediate remediation:

### 1. **glob** - Command Injection via -c/--cmd
- **Package:** glob (10.2.0 - 10.4.5)
- **Severity:** HIGH (CVSS 7.5)
- **Issue:** CLI command injection executes matches with shell:true
- **Advisory:** GHSA-5j98-mcp5-4vw2
- **Affected By:** @nestjs/cli (2.0.0-rc.1 - 10.4.9)
- **Fix Available:** @nestjs/cli@11.0.16 (breaking change)
- **CWE:** CWE-78 (Improper Neutralization of Special Elements used in an OS Command)

### 2. **tar** - Multiple Path Traversal Vulnerabilities
- **Package:** tar (<=7.5.6)
- **Severity:** HIGH (Multiple CVEs)
- **Issues:**
  - Arbitrary File Overwrite and Symlink Poisoning (GHSA-8qq5-rm4j-mr97)
  - Race Condition via Unicode Ligature Collisions on macOS APFS (GHSA-r6q2-hw4h-h46w, CVSS 8.8)
  - Arbitrary File Creation/Overwrite via Hardlink Path Traversal (GHSA-34x7-hfp2-rc4v, CVSS 8.2)
- **Affected By:** @mapbox/node-pre-gyp (<=1.0.11)
- **Fix Available:** Yes (npm audit fix)
- **CWE:** CWE-22 (Improper Limitation of a Pathname to a Restricted Directory), CWE-59 (Improper Link Resolution Before File Access)

### 3. **@nestjs/cli** - Transitive High Severity
- **Package:** @nestjs/cli (2.0.0-rc.1 - 10.4.9)
- **Severity:** HIGH (Direct dependency)
- **Root Causes:** glob, inquirer, @angular-devkit/schematics-cli
- **Fix Available:** @nestjs/cli@11.0.16 (breaking change)

---

## Moderate Severity Vulnerabilities (13)

### Build Tool Chain (5)
1. **esbuild** (<=0.24.2) - CVSS 5.3
   - Enables arbitrary requests to dev server
   - Advisory: GHSA-67mh-4wv8-2f99
   - Affects: vite, vite-node, vite-plugin-pwa, vitest
   - Fix: vite@7.3.1 (breaking)

2. **eslint** (<9.26.0) - CVSS 5.5
   - Stack Overflow on circular reference serialization
   - Advisory: GHSA-p5wg-g6qr-c7cg
   - Affects: @typescript-eslint/*, eslint-plugin-react-hooks
   - Fix: eslint@9.39.2 (breaking)

3. **vite** (0.11.0 - 6.1.6)
   - Depends on vulnerable esbuild
   - Fix: vite@7.3.1 (breaking)

4. **vite-node** (<=2.2.0-beta.2)
   - Depends on vulnerable vite
   - Fix: vitest@4.0.18 (breaking)

5. **vitest** (0.0.1 - 0.0.12 || 0.0.29 - 0.0.122 || 0.3.3 - 2.2.0-beta.2)
   - Depends on vulnerable vite and vite-node
   - Fix: vitest@4.0.18 (breaking)

### TypeScript Linting (4)
6. **@typescript-eslint/eslint-plugin** (<=8.0.0-alpha.62)
   - Depends on vulnerable eslint and related packages
   - Fix: @typescript-eslint/eslint-plugin@8.54.0 (breaking)

7. **@typescript-eslint/parser** (1.1.1-alpha.0 - 8.0.0-alpha.62)
   - Depends on vulnerable eslint
   - Fix: @typescript-eslint/parser@8.54.0 (breaking)

8. **@typescript-eslint/type-utils** (5.9.2-alpha.0 - 8.0.0-alpha.62)
   - Depends on vulnerable eslint and utils
   - Fix: @typescript-eslint/eslint-plugin@8.54.0 (breaking)

9. **@typescript-eslint/utils** (<=8.0.0-alpha.62)
   - Depends on vulnerable eslint
   - Fix: @typescript-eslint/eslint-plugin@8.54.0 (breaking)

### React Linting (1)
10. **eslint-plugin-react-hooks** (<=5.0.0-next-fecc288b7-20221025)
    - Depends on vulnerable eslint
    - Fix: eslint-plugin-react-hooks@7.0.1 (breaking)

### Backend Configuration (1)
11. **@nestjs/config** (>=1.1.6)
    - Depends on vulnerable lodash
    - Fix: @nestjs/config@1.1.5 (breaking)

### Utility Library (1)
12. **lodash** (4.0.0 - 4.17.21) - CVSS 6.5
    - Prototype Pollution in _.unset and _.omit
    - Advisory: GHSA-xxjr-mmjv-4gpg
    - CWE: CWE-1321 (Improper Restriction of Rendered UI Layers or Frames)

### Transitive (1)
13. **vite-plugin-pwa** (0.3.0 - 0.3.5 || 0.7.0 - 0.21.0)
    - Depends on vulnerable vite
    - Fix: vite-plugin-pwa@1.2.0 (breaking)

---

## Low Severity Vulnerabilities (4)

### CLI/Interactive Tools (3)
1. **inquirer** (3.0.0 - 8.2.6 || 9.0.0 - 9.3.7)
   - Depends on vulnerable external-editor
   - Affects: @angular-devkit/schematics-cli, @nestjs/cli
   - Fix: @nestjs/cli@11.0.16 (breaking)

2. **external-editor** (>=1.1.1)
   - Depends on vulnerable tmp
   - Affects: inquirer
   - Fix: @nestjs/cli@11.0.16 (breaking)

3. **tmp** (<=0.2.3) - CVSS 2.5
   - Arbitrary temp file/directory write via symlink
   - Advisory: GHSA-52f5-9888-hmc6
   - CWE: CWE-59 (Improper Link Resolution Before File Access)

### Build Tools (1)
4. **@angular-devkit/schematics-cli** (0.12.0-beta.0 - 18.1.0-rc.1)
   - Depends on vulnerable inquirer
   - Affects: @nestjs/cli
   - Fix: @nestjs/cli@11.0.16 (breaking)

---

## Dependency Tree Analysis

### Direct Dependencies with Vulnerabilities (8)
- @nestjs/cli (HIGH)
- @nestjs/config (MODERATE)
- @typescript-eslint/eslint-plugin (MODERATE)
- @typescript-eslint/parser (MODERATE)
- eslint (MODERATE)
- eslint-plugin-react-hooks (MODERATE)
- vite (MODERATE)
- vite-plugin-pwa (MODERATE)
- vitest (MODERATE)

### Transitive Dependencies with Vulnerabilities (13)
- @angular-devkit/schematics-cli (LOW)
- @mapbox/node-pre-gyp (HIGH)
- @typescript-eslint/type-utils (MODERATE)
- @typescript-eslint/utils (MODERATE)
- esbuild (MODERATE)
- external-editor (LOW)
- glob (HIGH)
- inquirer (LOW)
- lodash (MODERATE)
- tar (HIGH)
- tmp (LOW)
- vite-node (MODERATE)

---

## Fixability Analysis

### Fixable with `npm audit fix` (Non-Breaking)
- **tar** - Direct fix available
- **@mapbox/node-pre-gyp** - Resolves via tar update

### Fixable with `npm audit fix --force` (Breaking Changes)
- **@nestjs/cli** → 11.0.16 (major version bump)
- **eslint** → 9.39.2 (major version bump)
- **@typescript-eslint/** → 8.54.0 (major version bump)
- **vite** → 7.3.1 (major version bump)
- **vitest** → 4.0.18 (major version bump)
- **vite-plugin-pwa** → 1.2.0 (major version bump)
- **eslint-plugin-react-hooks** → 7.0.1 (major version bump)
- **@nestjs/config** → 1.1.5 (major version bump)

### Requires Manual Review
- **lodash** - Prototype pollution; verify usage patterns
- **glob** - Command injection; verify CLI usage in build scripts
- **tmp** - Symlink vulnerability; verify temp file handling

---

## Risk Assessment

### Critical Path Vulnerabilities
1. **@nestjs/cli** - Used in development; HIGH severity
2. **tar** - Used in dependency installation; HIGH severity
3. **glob** - Used in build processes; HIGH severity

### Development vs. Production Impact
- **Development Only:** eslint, @typescript-eslint/*, vitest, vite (dev dependencies)
- **Production Risk:** None directly (all vulnerabilities in dev/build chain)
- **Transitive Risk:** lodash in @nestjs/config (backend runtime)

### Recommended Action Plan

#### Phase 1: Immediate (Critical)
1. Update tar: `npm audit fix` (non-breaking)
2. Test build and functionality

#### Phase 2: Short-term (1-2 weeks)
1. Update @nestjs/cli to 11.0.16 with `npm audit fix --force`
2. Update eslint ecosystem to latest
3. Update vite ecosystem to latest
4. Run full test suite and verify no breaking changes

#### Phase 3: Medium-term (1 month)
1. Review lodash usage in @nestjs/config
2. Consider alternative to lodash if possible
3. Audit glob usage in build scripts
4. Implement automated security scanning in CI/CD

---

## Dependency Statistics

| Category | Count |
|----------|-------|
| Production Dependencies | 428 |
| Development Dependencies | 943 |
| Optional Dependencies | 78 |
| Peer Dependencies | 8 |
| **Total Dependencies** | **1,373** |

---

## Recommendations

### Short-term (This Sprint)
1. ✅ Run `npm audit fix` to resolve tar vulnerabilities
2. ✅ Test application thoroughly after tar update
3. ✅ Document any breaking changes

### Medium-term (Next Sprint)
1. Plan major version updates for eslint, vite, @nestjs/cli
2. Create feature branch for breaking changes
3. Run comprehensive test suite
4. Update CI/CD pipeline

### Long-term (Ongoing)
1. Implement automated security scanning (npm audit in CI)
2. Set up Dependabot or similar for automated PRs
3. Establish security update SLA (e.g., critical within 24h)
4. Regular security audits (monthly)
5. Keep dependencies up-to-date with latest patches

---

## Audit Metadata

- **Audit Date:** 2026-01-29
- **Audit Time:** 18:45 UTC
- **npm Version:** 10.x
- **Node Version:** 18.x+
- **Total Vulnerabilities:** 21
- **Fixable Automatically:** 19 (with --force)
- **Requires Manual Review:** 2

---

## Next Steps

1. **Baseline Established:** This report serves as the security baseline
2. **Track Changes:** Compare future audits against this baseline
3. **Monitor Fixes:** Document which vulnerabilities are addressed in each update
4. **Compliance:** Ensure all HIGH severity issues are resolved before production deployment

---

**Report Generated By:** npm audit  
**Baseline Version:** 1.0  
**Status:** Ready for comparison with future audits
