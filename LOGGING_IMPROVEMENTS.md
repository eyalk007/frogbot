# Frogbot Logging Improvements

This document tracks logging improvements for both `scan-repository` and `scan-pull-request` commands.

---

## 🎯 Overview

Based on analysis of real scan logs and codebase review, we've identified **specific troublesome logs** that need improvement. This document focuses on fixing actual logs that currently don't provide enough information to troubleshoot issues.

### 🎯 Files That Need Logging Improvements

**High Priority:**
1. `packagehandlers/pythonpackagehandler.go` - Lines 80, 91, 94 (fix error context)
2. `scanrepository/scanrepository.go` - Lines 264, 395, 437, 447, 719 (fix/PR errors)
3. `utils/utils.go` - Lines 195, 212 (HTTP upload errors)
4. `utils/comment.go` - Line 54 (PR comment errors)
5. `scanpullrequest/scanpullrequest.go` - Add source/target separation logs

**Medium Priority:**
6. All package handlers - Improve error context
7. VCS client wrappers - Add HTTP error context
8. Git operations - Add command details to errors

### 📊 Types of Issues to Fix

1. **HTTP Errors (4xx/5xx)** - Missing request/response details, no payload info
2. **Fix Operation Failures** - Missing package/file context, duplicate errors
3. **File Not Found Errors** - Missing working directory, no file list
4. **PR/Comment Failures** - Missing HTTP status codes, no actionable info
5. **Generic Error Messages** - "an error occurred" without specifics

---

## 📋 Implementation Checklist

Priority is fixing **actual troublesome logs** that users encounter today.

### **Both Commands (scan-repository & scan-pull-request)**

#### 1. Configuration Logging (DEBUG level)
- [ ] Log all Frogbot-related environment variables (JF_* vars)
- [ ] Log OS information (darwin, linux, windows + version)
- [ ] Log centralized config profile values (if enabled)
- [ ] Log effective configuration being used
- [ ] Show which values came from env vars vs config profile

**Location:** At scan initialization, before any scan operations begin

**Example:**
```
[Debug] Frogbot Configuration:
  OS: darwin 24.5.0 (arm64)
  Frogbot Version: 2.15.0
  Repository: owner/repo-name
  Branch: main
  
  Platform:
    JF_URL: http://localhost:8083
    JF_XRAY_VERSION: 3.999.0
    JF_XSC_VERSION: 3.999.999
  
  Git Provider:
    JF_GIT_PROVIDER: github
    JF_GIT_OWNER: eranturgeman
    JF_GIT_REPO: jas-vulnerable
    JF_GIT_API_ENDPOINT: https://api.github.com/
  
  Scan Configuration:
    JF_FAIL: true
    JF_FIXABLE_ONLY: false
    JF_MIN_SEVERITY: <not set>
    JF_ALLOW_PARTIAL_RESULTS: false
    JF_DISABLE_ADVANCED_SECURITY: false
    JF_SKIP_AUTOFIX: false
    JF_INCLUDE_VULNERABILITIES: true
    JF_WORKING_DIR: .
  
  ... (all relevant JF_* vars)
```

---

#### 2. Repository/Branch Context (INFO level as today its at the DEBUG)
- [ ] Log repository owner/name clearly
- [ ] Log branch being scanned
- [ ] Log commit hash (when available)
- [ ] Log Git provider (maybe even don in the first level)

**Location:** At the start of each branch scan

**Example:**
```
[Info] Scanning Repository: eyalk007/WebGoat
[Info] Branch: main
[Info] Commit: abc123def456...
[Info] Provider: GitHub
```

---

#### 3. Partial Results Summary (When enabled)
- [ ] Log scan status for each scan type (SCA, Secrets, IaC, SAST, Applicability)
- [ ] Show which scans succeeded vs failed
- [ ] Indicate when results are being filtered due to failures
- [ ] Show final status of what's included in results

**Condition:** Only log when `JF_ALLOW_PARTIAL_RESULTS=true`

**Location:** After all scans complete, before results processing

**Example:**
```
[Info] Partial Results Mode Enabled - Scan Status Summary:
  SCA:            ✅ Success
  Secrets:        ❌ Failed (status code: 1) - Results filtered
  IaC:            ✅ Success
SAST:           ✅ Success
  Applicability:  ⏭️  Skipped (no SCA vulnerabilities)
  
  Final Results: Including SCA, IaC, and SAST findings
```

---

#### 4. HTTP Error Context (ERROR/WARN level)
- [ ] Fix: `utils/utils.go:195` - SARIF upload errors
- [ ] Fix: `utils/utils.go:212` - SBOM upload missing env vars
- [ ] Fix: `scanrepository/scanrepository.go:447` - PR creation errors (add context)
- [ ] Fix: `scanrepository/scanrepository.go:437` - PR comment errors
- [ ] Fix: `utils/comment.go:54` - PR comment errors
- [ ] General: Log HTTP request details for all 4xx/5xx errors
- [ ] General: Show request method, URL, and sanitized payload
- [ ] General: Show response status code and error body
- [ ] General: Add context about what operation failed

**Location:** Whenever HTTP requests fail with 4xx/5xx status codes

**Example - Current (unclear):**
```
[Warn] upload code scanning for main branch failed with: POST https://api.github.com/repos/eranturgeman/jas-vulnerable/code-scanning/sarifs: 403 Code scanning is not enabled for this repository. Please enable code scanning in the repository settings. []
```

**Example - Improved:**
```
[Warn] Failed to upload SARIF code scanning results
  Operation: Upload code scanning to GitHub
  Repository: eranturgeman/jas-vulnerable
  Branch: refs/heads/main
  
  HTTP Request:
    Method: POST
    URL: https://api.github.com/repos/eranturgeman/jas-vulnerable/code-scanning/sarifs
    
  HTTP Response:
    Status: 403 Forbidden
    Error: Code scanning is not enabled for this repository
    
  Action Required: Enable code scanning in repository settings at:
  https://github.com/eranturgeman/jas-vulnerable/settings/security_analysis
```

**Example - 400 Bad Request:**
```
[Error] HTTP request failed during dependency graph submission
  Operation: Upload SBOM snapshot to GitHub
  Repository: owner/repo-name
  
  HTTP Request:
    Method: POST
    URL: https://api.github.com/repos/owner/repo-name/dependency-graph/snapshots
    Payload Size: 15.2 KB
    Payload (first 500 chars): {"version": 0, "job": {...}, "sha": "abc123"...}
    
  HTTP Response:
    Status: 400 Bad Request
    Error Body: {"message": "Invalid request", "errors": [{"field": "job.correlator", "code": "missing"}]}
    
  Possible Cause: GITHUB_JOB environment variable is not set
  Documentation: https://docs.github.com/en/code-security/supply-chain-security/...
```

---

### **Scan Repository Only**

#### 4. Technology Detection (INFO level)
- [ ] Promote "Detected technologies" from DEBUG to INFO
- [ ] Promote "Calculating [Technology] dependencies" from DEBUG to INFO

**Location:** During dependency resolution phase

**Example:**
```
[Info] Detected technologies: [maven]
[Info] Calculating Maven dependencies...
[Info] Created 'Maven' dependency tree with 204 nodes. Elapsed time: 2.3 seconds.
```

---

#### 5. Better Fix Error Context (ERROR/INFO level)
- [ ] Fix: `packagehandlers/pythonpackagehandler.go:80` - Requirements file errors
- [ ] Fix: `packagehandlers/pythonpackagehandler.go:91` - Package not found errors
- [ ] Fix: `scanrepository/scanrepository.go:264` - Fix vulnerabilities aggregation (remove duplicates)
- [ ] Fix: `scanrepository/scanrepository.go:395` - PR creation during fix
- [ ] Fix: `scanrepository/scanrepository.go:719` - Aggregate PR creation errors
- [ ] General: Show package name/version being fixed
- [ ] General: Show working directory where fix was attempted
- [ ] General: Show exact files that were checked/modified (found vs not found)
- [ ] General: Show command that was run (if applicable)
- [ ] General: Provide actionable next steps

**Location:** When fix operations fail

**Example - Current (unclear):**
```
[Error] the following errors occured while fixing vulnerabilities in '/var/folders/96/.../T/jfrog.cli.temp.-1764510346-331447333':
an error occurred while attempting to read the requirements file:
open setup.py: no such file or directory
an error occurred while attempting to read the requirements file:
open setup.py: no such file or directory
```

**Problems with current:**
- Doesn't say which package failed (pyyaml or werkzeug?)
- Doesn't explain why it's looking for setup.py
- Error is repeated twice without context
- No actionable guidance

**Example - Improved:**
```
[Error] Failed to fix pyyaml (5.2 → 5.4)
  Package Manager: pip
  Working Directory: /var/folders/96/.../T/jfrog.cli.temp.-1764510346-331447333
  
  Descriptor Files Found:
    - requirements.txt ✓ (found)
    - setup.py ✗ (not found)
    - setup.cfg ✗ (not found)
    - pyproject.toml ✗ (not found)
  
  Error: Cannot update package without setup.py or pyproject.toml
  
  Current Fix Strategy: Frogbot attempts to update dependencies by:
    1. Reading requirements.txt for direct dependencies
    2. Modifying setup.py or pyproject.toml to pin versions
  
  Reason for Failure: This project uses requirements.txt without a setup.py.
  Direct version pinning in requirements.txt may break indirect dependencies.
  
  Recommendation: Manually update pyyaml to version 5.4 in requirements.txt

[Error] Failed to fix werkzeug (1.0.1 → 3.0.6)
  Package Manager: pip
  Working Directory: /var/folders/96/.../T/jfrog.cli.temp.-1764510346-331447333
  
  Error: Same issue as pyyaml - setup.py not found
  
  Recommendation: Manually update werkzeug to version 3.0.6 in requirements.txt

[Info] Fix Summary: 0 succeeded, 2 failed out of 2 fixable vulnerabilities
```

---

### **Scan Pull Request Only**

#### 6. Diff Results Summary (INFO level)
- [ ] Log total issues in target branch
- [ ] Log total issues in source branch
- [ ] Log new issues introduced by PR (diff result)
- [ ] Break down by scan type (SCA, Secrets, IaC, SAST)

**Location:** After diff comparison, before posting PR comments

**Example:**
```
[Info] Diff Analysis Results:
  Target branch (main):          5 issues
  Source branch (feature-xyz):   12 issues
  
  New Issues Introduced by PR:   7 issues
    ├─ SCA vulnerabilities:      3
    ├─ Secrets exposures:        2
    ├─ IaC issues:               0
    └─ SAST vulnerabilities:     2
```

---

#### 7. Clear Source vs Target Separation (INFO level)
- [ ] Log clear separator when starting target scan
- [ ] Log target scan completion with issue count
- [ ] Log clear separator when starting source scan
- [ ] Log source scan completion with issue count
- [ ] Add visual separation (e.g., "---" or similar)

**Location:** During audit operations

**Example:**
```
[Info] ============================================
[Info] Scanning TARGET branch: main (baseline)
[Info] ============================================
[Debug] Downloading target branch code...
[Info] Scanning target branch code...
[Info] Target scan completed: 5 issues found

[Info] ============================================
[Info] Scanning SOURCE branch: feature-xyz (PR changes)
[Info] ============================================
[Debug] Downloading source branch code...
[Info] Scanning source branch code...
[Info] Source scan completed: 12 issues found

[Info] ============================================
[Info] Comparing source vs target (diff mode)
[Info] ============================================
[Info] Found 7 new issues introduced by this PR
```

---

## 🎬 Implementation Order

### Phase 1: Configuration & Context
1. Config debug dump with OS info (both commands)
2. Repo/branch context (both commands)

### Phase 2: Error Context
3. HTTP error logging with payloads (both commands)
4. Fix error improvements (repo only)

### Phase 3: Scan Flow Clarity
5. Source/target separation (PR only)
6. Partial results summary (both commands)

---

## 📝 Notes

### Security
- **Always sanitize tokens/passwords** from debug logs
- Mask sensitive data in HTTP payloads (Authorization headers, tokens, etc.)
- Only log first/last 4 chars of secrets if needed for debugging

### Error Logging Best Practices
- **Always include context**: What were we trying to do when it failed?
- **Show the data**: What file/URL/package/version was involved?
- **Explain the why**: Why did it fail? What was missing/wrong?
- **Provide next steps**: What can the user do to fix it?
- **Avoid repetition**: Don't log the same error twice without additional context

### HTTP Error Logging
- Always log the full request context (method, URL, relevant headers)
- Log response status code and error body (first 1000 chars if too large)
- Suggest possible causes and remediation steps
- For 4xx errors: Usually user/config issue - suggest what to check
- For 5xx errors: Server issue - suggest retry or contact support

### Formatting
- Use consistent formatting for error blocks
- Use indentation to show hierarchy/relationships
- Keep signal-to-noise ratio high - every log should be actionable

---

## 🚨 **ACTUAL Troublesome Logs in Current Codebase**

These are real logs from the codebase that need improvement:

### 1. **HTTP Upload Failures - No Request Details**
**File:** `utils/utils.go:195`
```go
return fmt.Errorf("upload code scanning for %s branch failed with: %s", branch, err.Error())
```
**Current Log:**
```
[Warn] upload code scanning for main branch failed with: POST https://api.github.com/repos/eranturgeman/jas-vulnerable/code-scanning/sarifs: 403 Code scanning is not enabled for this repository. Please enable code scanning in the repository settings. []
```
**Problems:**
- No indication what SARIF was being uploaded (SCA? Secrets? SAST?)
- No payload size or scan results count
- Error message is one long line
- Empty `[]` at the end is unclear

**Needs:**
- Multi-line formatted error
- Scan type being uploaded
- Actionable link to repository settings
- HTTP request/response details

---

### 2. **Python Fix Errors - No File Context**
**File:** `packagehandlers/pythonpackagehandler.go:80`
```go
return errors.New("an error occurred while attempting to read the requirements file:\n" + err.Error())
```
**Current Log:**
```
[Error] an error occurred while attempting to read the requirements file:
open setup.py: no such file or directory
```
**Problems:**
- Doesn't say which package was being fixed
- Doesn't explain why it's looking for setup.py when requirements.txt exists
- No working directory shown
- No list of what descriptor files exist
- Generic "an error occurred" prefix

**Needs:**
- Package name and version being fixed
- Working directory path
- List of descriptor files found/not found
- Explanation of fix strategy

---

### 3. **Fix Vulnerabilities - Repeated Errors Without Context**
**File:** `scanrepository/scanrepository.go:264`
```go
err = errors.Join(err, fmt.Errorf("the following errors occured while fixing vulnerabilities in '%s':\n%s", fullPath, e))
```
**Current Log (from actual run):**
```
[Error] the following errors occured while fixing vulnerabilities in '/var/folders/96/.../T/jfrog.cli.temp.-1764510346-331447333':
an error occurred while attempting to read the requirements file:
open setup.py: no such file or directory
an error occurred while attempting to read the requirements file:
open setup.py: no such file or directory
```
**Problems:**
- Says "errors occured" (typo: occurred)
- Shows same error twice without saying which packages failed
- No distinction between first failure and second failure
- Temp directory path is not useful - user doesn't know what project it was

**Needs:**
- Each package failure on separate line with context
- Package names clearly shown
- Avoid duplicate errors
- Show relative project path, not temp dir

---

### 4. **Pull Request Creation Failures - No API Context**
**File:** `scanrepository/scanrepository.go:395`
```go
return errors.Join(fmt.Errorf("failed while creating a fixing pull request for: %s with version: %s with error: ", vulnDetails.ImpactedDependencyName, fixVersion), err)
```
**File:** `scanrepository/scanrepository.go:447-453`
```go
if err = cfp.scanDetails.Client().CreatePullRequest(...); err != nil {
    return  // No error context added!
}
```
**Current Log:**
```
[Error] failed while creating a fixing pull request for: pyyaml with version: 5.4 with error: <some API error>
```
**Problems:**
- No HTTP status code
- No indication if it's a permissions issue, rate limit, or validation error
- No PR title/body shown (maybe validation failed on title?)
- "with error:" prefix is awkward
- VCS API error is passed through without enhancement

**Needs:**
- HTTP request details (method, URL, payload)
- HTTP response (status code, error body)
- PR details (title, source/target branches)
- Suggested remediation based on error type

---

### 5. **PR Comment Failures - No Context**
**File:** `scanrepository/scanrepository.go:437` and `utils/comment.go:54`
```go
err = errors.New("couldn't add pull request comment: " + err.Error())
```
**Current Log:**
```
[Error] couldn't add pull request comment: <API error>
```
**Problems:**
- No PR number
- No comment content (or preview)
- No HTTP status code
- Could be rate limit, permissions, or validation issue
- Same error in multiple places without distinguishing context

**Needs:**
- PR number
- Comment type (summary vs review)
- HTTP status code
- Comment preview (first 100 chars)
- Specific remediation

---

### 6. **SBOM Upload - Missing Env Var**
**File:** `utils/utils.go:212`
```go
return fmt.Errorf("%s env var is empty and required for Github Dependency submission", utils.CurrentGithubWorkflowJobEnvVar)
```
**Current Log:**
```
[Warn] GITHUB_JOB env var is empty and required for Github Dependency submission
```
**Problems:**
- Shows as WARN in logs but actually prevents upload
- Doesn't explain what GITHUB_JOB is used for
- No link to documentation
- Doesn't show what other env vars are needed

**Needs:**
- Explain purpose of GITHUB_JOB (correlator for dependency graph)
- Show all required env vars for SBOM upload
- Link to GitHub Actions documentation
- Maybe should be ERROR if it prevents upload?

---

### 7. **Aggregate PR Failures - Generic Message**
**File:** `scanrepository/scanrepository.go:719`
```go
err = errors.Join(err, fmt.Errorf("failed while creating aggregated pull request. Error: \n%s", e.Error()))
```
**Current Log:**
```
[Error] failed while creating aggregated pull request. Error: 
<nested error>
```
**Problems:**
- No indication how many packages were in the aggregate PR
- No branch name shown
- No list of what succeeded vs failed
- Nested error might not have context either

**Needs:**
- Branch name of aggregate fix
- Count of packages included
- List of successfully fixed packages
- Specific reason for PR creation failure

---

### 8. **Package Not Found in Descriptor**
**File:** `packagehandlers/pythonpackagehandler.go:91`
```go
return fmt.Errorf("impacted package %s not found, fix failed", vulnDetails.ImpactedDependencyName)
```
**Current Log:**
```
[Error] impacted package pyyaml not found, fix failed
```
**Problems:**
- Doesn't say in which file it wasn't found
- Could be wrong case (PyYAML vs pyyaml)?
- Could be indirect dependency?
- No explanation of what was searched

**Needs:**
- Which descriptor file was searched
- What patterns were searched (exact name, lowercase, etc.)
- Whether it's direct or indirect dependency
- Suggestion: Maybe it's in a different requirements file?

---

## 🔍 Examples of Currently Unclear Logs to Fix

### 1. Git Errors (No Context)
**Current:**
```
[Error] failed to create branch: exit status 128
```
**Needs:** What branch name? What git command failed? What was the git error message?

---

### 2. Package Handler Errors (No Details)
**Current:**
```
[Debug] Skipping vulnerable package X since it is not defined in your package descriptor file
```
**Needs:** Which descriptor file? What files were checked? Is it an indirect dependency?

---

### 3. VCS Client Errors (No Request Info)
**Current:**
```
[Error] failed to create pull request
```
**Needs:** What repo? What was the PR title? What was the API response? Rate limit? Permissions?

---

### 4. Scan Failures (No Status Codes)
**Current:**
```
[Debug] Sca scan has completed with errors. Sca vulnerabilities and violations results will be removed from final report
```
**Needs:** What was the error? Status code? Can it be retried? Is it a timeout or auth issue?

---

### 5. File Operation Errors (No Path Context)
**Current:**
```
[Error] failed to read requirements file: no such file or directory
```
**Needs:** What file path? What directory were we in? What files DO exist?

---

## 🔍 Future Considerations

Items that were discussed but not approved for this phase:
- Detailed scan duration breakdown per scan type
- Detailed table-style results summary
- Git operation details (commit hashes, push status) - unless errors occur
- Multi-project progress indicators (may be deprecated)

---

## ✅ Completion Criteria

This logging improvement initiative is complete when:
1. All checkboxes above are marked as done
2. Logs have been tested with real scans
3. Both scan-repository and scan-pull-request produce clear, actionable logs
4. Debugging common issues is significantly easier with the new logs

