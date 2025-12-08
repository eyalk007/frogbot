# Frogbot Logging Improvements - NEW SCA Engine (v3)

This document analyzes the new-sca-support--v3 branch logs and identifies what needs improvement.

---

## 🆕 **What's NEW in v3 Engine (GOOD!)**

### ✅ **Improvements Already in Place:**

1. **SBOM Generation Logging**
```
[Info] Generating SBOM...
[Info] SBOM generated; found 20 library components (duration 486.555792ms)
```
✅ Great! Shows count AND duration

2. **Per-Scan Duration Reporting**
```
[Info] [Thread 1] Found 4 SCA vulnerabilities (duration 11.389145958s)
[Info] [Thread 1] Found 9 SAST vulnerabilities (duration 1m10.630411167s)
[Info] [Thread 3] Found 1 Secrets exposures (duration 1m14.515645042s)
[Info] [Thread 0] No IaC vulnerabilities were found (duration 1m8.75088225s)
```
✅ Excellent! Clear per-scan results with durations

3. **Scan Results Upload to Artifactory**
```
[Info] Finished scanning. Uploading scan results to Artifactory
[Info] These files were uploaded:
 frogbot
└──  github.com
    └──  eyalk007
        └──  flask-webgoat
            └──  master
                └──  commits
                    └──  source_code_1764763731207.cdx.json
[Info] You may view the scan results in the JFrog platform, under Xray -> Scans List -> Git Repositories
```
✅ Nice! Clear upload confirmation and where to view results

4. **Clearer Technology Detection**
```
[Debug] Detected 1 technologies at /path: [pip].
[Info] Performing scans on pip project '<root>'
```
✅ Better than before

---

## 🚨 **Issues in NEW v3 Logs (FROGBOT-OWNED ONLY)**

### ⚠️ **Note: External Tool Logs**
Some logs are from external tools (jfrog-cli-security, go-plugin, analyzer-manager) that Frogbot doesn't control:
- ❌ "Multiple locations found..." - From jfrog-cli-security conversion
- ❌ Plugin startup logs with `%!(EXTRA ...)` - From go-plugin library
- ❌ Analyzer manager JSON output - From analyzer manager binary

**We can only fix FROGBOT's own logs below.**

---

### **1. NO SCAN RESULTS SUMMARY (FROGBOT-OWNED)**

### **2. GITHUB_JOB Warning - Still No Context (FROGBOT-OWNED)**

**What we have:**
```
[Info] [Thread 1] Found 4 SCA vulnerabilities (duration 11.389145958s)
[Info] [Thread 0] No IaC vulnerabilities were found (duration 1m8.75088225s)
[Info] [Thread 1] Found 9 SAST vulnerabilities (duration 1m10.630411167s)
[Info] [Thread 3] Found 1 Secrets exposures (duration 1m14.515642s)
[Info] Xray scan completed
```

**Missing:** A clear summary before moving to fixes

**Need:**
```
[Info] Xray scan completed

[Info] Scan Results Summary:
  SCA vulnerabilities:        4 (1 fixable)
  SAST vulnerabilities:       9 (requires code changes)
  Secrets exposures:          1 (requires code changes)
  IaC vulnerabilities:        0
  ──────────────────────────────────
  Total issues found:         14
  Total fixable (auto-fix):   1
```

---

### **3. NO CONFIGURATION DEBUG DUMP (FROGBOT-OWNED)**

**Current:**
```
[Warn] GITHUB_JOB env var is empty and required for Github Dependency submission
```

**Still problems:**
- Doesn't explain what it does
- Doesn't say SBOM upload was skipped
- No link to documentation

**Need:**
```
[Warn] SBOM Upload Skipped - Missing GITHUB_JOB Environment Variable
  
  The SBOM snapshot cannot be uploaded to GitHub Dependency Graph because
  the GITHUB_JOB environment variable is not set.
  
  This environment variable is automatically set in GitHub Actions but may
  be missing in local development or other CI systems.
  
  Impact: Dependency insights won't appear in GitHub's dependency graph.
  
  To enable: Run Frogbot in GitHub Actions where GITHUB_JOB is automatically set.
  Documentation: https://docs.github.com/en/code-security/supply-chain-security/...
```

---

### **4. FIX SECTION - Why Only 1 out of 4? (FROGBOT-OWNED)**

**Missing at start:**
```
[Debug] Frogbot Configuration:
  OS: darwin 24.5.0 (arm64)
  Frogbot Version: 0.0.0
  Repository: eyalk007/flask-webgoat
  Branch: master
  Commit: af8895160a5f...
  
  JFrog Platform:
    JF_URL: https://z0xraylnp2.jfrogdev.org
    JF_XRAY_VERSION: 3.999.99-preRelease-3-134-017
    JF_XSC_VERSION: 3.999.999
  
  Git Provider:
    JF_GIT_PROVIDER: github
    JF_GIT_OWNER: eyalk007
    JF_GIT_REPO: flask-webgoat
  
  Scan Settings:
    JF_DISABLE_ADVANCED_SECURITY: false
    JF_FIXABLE_ONLY: false
    JF_MIN_SEVERITY: <not set>
    JF_SKIP_AUTOFIX: false
```

**Why needed:** Helps debug configuration issues

---

### **5. NO END SUMMARY (FROGBOT-OWNED)**

**Current:**
```
[Info] [Thread 1] Found 4 SCA vulnerabilities (duration 11.389145958s)
... (other scans)
[Info] Xray scan completed
[Debug] Frogbot will attempt to resolve the following vulnerable dependencies:
 requests
```

**Problems:**
- Found 4 SCA vulnerabilities
- Only fixing 1 (requests)
- **Doesn't explain WHY the other 3 aren't being fixed**

**Need:**
```
[Info] Analyzing fixable vulnerabilities...

[Debug] SCA Vulnerabilities Breakdown:
  ✅ requests (2.19.1): Fixable - upgrade to 2.32.4
  ❌ flask (1.1.2): Not fixable - no fix version available
  ❌ jinja2 (2.11.3): Not fixable - already upgraded to 3.1.6 (duplicate version)
  ❌ werkzeug (1.0.1): Not fixable - indirect dependency

[Info] Frogbot will attempt to fix 1 out of 4 SCA vulnerabilities
```

---

---

## ❌ **External Tool Logs (NOT Frogbot - Can't Fix)**

### **1. "Multiple locations found" - jfrog-cli-security**
```
[Debug] Multiple locations found for component <root> evidence, using the first one as location
```
**Source:** jfrog-cli-security library (conversion code)
**Can't Fix:** This is owned by jfrog-cli-security team, not Frogbot
**Workaround:** Could suppress DEBUG logs from that library if too noisy

---

### **2. Plugin Printf Formatting - go-plugin library**
```
[Debug] starting plugin%!(EXTRA string=path, string=..., string=args, []string=[])
```
**Source:** go-plugin library or plugin wrapper code
**Can't Fix:** Printf formatting issues in external library
**Workaround:** Report to go-plugin maintainers

---

### **3. Analyzer Manager Logs**
All the JSON-formatted logs from analyzer manager are external
**Source:** analyzer-manager binary
**Can't Fix:** Not Frogbot's code

---

## 🎯 **FROGBOT-OWNED Issues Summary**

**Current:**
```
[Info] Created Pull Request updating dependency 'requests' to version '2.32.4'
[Info] Frogbot "scan-repository" command finished successfully
```

**Missing:** Recap of what happened

**Need:**
```
[Info] ═══════════════════════════════════════════════════════
[Info] Frogbot Scan Summary
[Info] ═══════════════════════════════════════════════════════

Scan Results:
  Total vulnerabilities found:    14
  ├─ SCA:                         4
  ├─ SAST:                        9
  ├─ Secrets:                     1
  └─ IaC:                         0

Fix Results:
  Fixable vulnerabilities:        1
  ├─ ✅ Successfully fixed:       1
  ├─ ❌ Failed to fix:            0
  └─ ⏭️  Skipped:                 0

Pull Requests:
  ✅ Created: 1 PR
     - requests (2.19.1 → 2.32.4)

Scan Duration: 2m 37s
View results: https://z0xraylnp2.jfrogdev.org/ui/scans-list/git-repositories

[Info] Frogbot "scan-repository" command finished successfully
```

---


## 📋 **Implementation Checklist for v3 (FROGBOT-OWNED ONLY)**

### **Critical (Do First):**
- [ ] **Add scan results summary** after "Xray scan completed" (scanrepository.go)
- [ ] **Improve GITHUB_JOB warning** with context and documentation (utils/utils.go)
- [ ] **Add fix explanation** - Why only 1 out of 4 vulnerabilities is being fixed (scanrepository.go)

### **High Priority:**
- [ ] **Add configuration debug dump** at start with OS info (scanrepository.go, scanpullrequest.go)
- [ ] **Add end summary** with scan results, fix results, and PRs created (scanrepository.go)

### **Medium Priority:**
- [ ] **Explain fixable vs non-fixable** for each vulnerability type
- [ ] **Add context to all HTTP errors** (if they occur in Frogbot code)
- [ ] Consider promoting some DEBUG logs to INFO

### **Can't Fix (External):**
- ❌ "Multiple locations found" spam (jfrog-cli-security)
- ❌ Plugin Printf formatting (go-plugin library)
- ❌ Analyzer manager verbose logs

### **Keep As-Is (Already Good):**
- ✅ SBOM generation with count and duration
- ✅ Per-scan duration reporting
- ✅ Scan results upload confirmation
- ✅ PR creation logs with clear steps
- ✅ "Performing scans on pip project" clarity

---

## 🎯 **Frogbot Files That Need Changes**

Based on Frogbot-owned logs only:

1. **scanrepository/scanrepository.go** - Add scan results summary (after line ~233)
2. **scanrepository/scanrepository.go** - Add end summary (before "finished successfully")
3. **scanrepository/scanrepository.go** - Add fix explanation logic (around line ~240)
4. **scanrepository/scanrepository.go** - Add configuration dump at start (after line ~70)
5. **utils/utils.go** - Improve GITHUB_JOB warning (around line ~212)
6. **scanpullrequest/scanpullrequest.go** - Same improvements for PR scan

---

## 💡 **Key Differences from Old Engine**

### **OLD Engine Had:**
- "Calculating Maven dependencies..."
- "Created 'Maven' dependency tree with 204 nodes"
- Direct Xray scan API calls

### **NEW Engine Has:**
- "Generating SBOM..."
- "SBOM generated; found 20 library components"
- Catalog enrichment
- Artifactory upload of results
- Link to Xray Scans List

### **Both Missing:**
- Configuration summary at start
- Scan results summary
- Fix explanation (why some aren't fixable)
- End summary with recap

---

## 🔧 **Next Steps (Frogbot-Owned Only)**

**Priority Order:**
1. ✅ Add scan results summary (most visible improvement)
2. ✅ Add end summary (closes the loop nicely)
3. ✅ Add fix explanation (why only 1/4 is fixable)
4. ✅ Improve GITHUB_JOB warning (better UX)
5. ✅ Add configuration dump (helps debugging)

**NOT Doing (External Tools):**
- ❌ "Multiple locations found" - jfrog-cli-security issue
- ❌ Plugin Printf bugs - go-plugin library issue
- ❌ Analyzer manager verbosity - external binary

Want to start implementing the Frogbot-owned improvements? 🚀

