# Gradle Map Format & Dynamic Version Support

**Branch:** `fix-gradle-package-handler`  
**Status:** Ready for testing  
**Date:** December 22, 2025

---

## 🎯 What We Built

### 1. **Gradle Map Format Support**
Added support for Gradle's map-style dependency syntax:
```gradle
implementation group: 'commons-io', name: 'commons-io', version: '2.5'
implementation group: "junit", name: "junit", version: "4.+"
```

**Before:** Only supported string format `implementation 'group:artifact:version'`  
**After:** Supports both string format AND map format (like Renovate/Dependabot)

### 2. **Dynamic Version Detection**
Detects and handles dynamic versions:
- `4.+` (wildcard)
- `4.0-LATEST` (latest keyword)
- Treats them specially in version comparisons

### 3. **SBOM Component Mapping**
Enhanced SBOM parsing to map components back to descriptor dependencies:
- Parses `gav://group:artifact:version` format from SBOM
- Matches with descriptor dependencies (exact or dynamic)
- Stores actual resolved version alongside descriptor version

### 4. **Smart Version Comparison**
New logic to decide when to report vulnerabilities:
- Don't report if descriptor version already matches fix
- Don't report if actual (resolved) version already matches fix
- Prevents false positives on already-fixed dependencies

---

## 📁 Files Modified

1. **`packagehandlers/gradlepackagehandler.go`**
   - Added `directMapWithVersionRegexp` for exact versions
   - Added `directMapWithDynamicVersionRegexp` for dynamic versions
   - Handles both single/double quotes

2. **`utils/utils.go`**
   - Added `IsDynamicVersion()` - detects `+` and `LATEST`
   - Added `ShouldReportForVersion()` - smart vulnerability reporting logic

3. **`scanrepository/scanrepository.go`**
   - Enhanced `GetUniqueLibraryComponents()` with regex-based parsing
   - Better SBOM component → descriptor dependency mapping

4. **`utils/scandetails.go`**
   - Added `ActualVersion` field to `VulnerableComponentRow`
   - Stores real resolved version from SBOM

5. **`packagehandlers/commonpackagehandler.go`**
   - Populates `ActualVersion` during vulnerability mapping

---

## 🧪 Test Repository

**Location:** `/Users/eyalk/Desktop/fun-projects/gradle-multi-module`

**Test file (`build.gradle`):**
```gradle
dependencies {
    // Map format with EXACT version (should be flagged as vulnerable)
    implementation group: "commons-io", name: "commons-io", version: "2.5"
    
    // Map format with DYNAMIC version
    testImplementation group: "junit", name: "junit", version: "4.+"
}
```

**Lock file:** `gradle.lockfile` - contains resolved versions

**Expected behavior:**
1. Scanner detects `commons-io:2.5` is vulnerable
2. Suggests fix to `2.14.0`
3. Our code finds map format in `build.gradle`
4. Replaces `version: "2.5"` with `version: "2.14.0"`
5. Creates PR with fix

---

## 🔍 How It Works

### Flow:
```
1. Gradle lockfile → Extract dependencies (with versions)
   ↓
2. JFrog Xray scan → Returns SBOM with gav:// components
   ↓
3. GetUniqueLibraryComponents() → Parse SBOM, map to descriptors
   ↓
4. ShouldReportForVersion() → Check if vulnerability should be reported
   ↓
5. Gradle package handler → Find and replace in build.gradle
   ↓
6. Create PR with fix
```

### Key Regex Patterns:

**Map format (exact version):**
```go
`(?m)group\s*:\s*['"]%s['"],\s*name\s*:\s*['"]%s['"],\s*version\s*:\s*['"]%s['"]`
```

**Map format (dynamic version):**
```go
`(?m)group\s*:\s*['"]%s['"],\s*name\s*:\s*['"]%s['"],\s*version\s*:\s*['"][^'"]*\+[^'"]*['"]`
```

---

## 🐛 What Was Broken Before

### Problem 1: Map Format Not Supported
```gradle
// This format was IGNORED by frogbot
implementation group: "commons-io", name: "commons-io", version: "2.5"
```
**Result:** Vulnerabilities not fixed, PRs not created

### Problem 2: Dynamic Versions Not Handled
```gradle
// Dynamic version resolved to 4.13.2 in lockfile
testImplementation "junit:junit:4.+"
```
**Result:** False reports or missed vulnerabilities

### Problem 3: SBOM Mapping Was Naive
```
SBOM: gav://commons-io:commons-io:2.5
Descriptor: Has no version info for this component
```
**Result:** Couldn't match SBOM vulnerabilities to descriptor dependencies

---

## 🔄 Comparison with Competitors

### What Renovate/Dependabot Have:
✅ Map format support  
✅ Dynamic version handling  
✅ Accurate SBOM → descriptor mapping  
✅ Smart version comparison  

### What We Had:
❌ Only string format  
❌ Treated dynamic versions as exact  
❌ Simple string matching for SBOM  
❌ Basic version equality check  

### What We Have Now:
✅ Map format support (DONE)  
✅ Dynamic version detection (DONE)  
✅ Enhanced SBOM parsing (DONE)  
✅ Smart version logic (DONE)  
⚠️ TOML support (TODO - for Gradle version catalogs)

---

## 📋 Next Steps

### Testing:
1. Run full frogbot scan on test repo
2. Verify PR creation with correct fixes
3. Test edge cases:
   - Multiple map formats in same file
   - Mixed string and map syntax
   - Transitive dependencies

### Future Enhancements:
1. **TOML support** - Gradle version catalogs use TOML files
2. **Gradle Kotlin DSL** - Support for `build.gradle.kts`
3. **More edge cases** - Nested configurations, custom configurations

### Backburner Items:
- TOML file parsing for version catalogs
- More sophisticated version comparison (semver)
- Support for Maven POM map format

---

## 🚀 How to Continue This Work

1. **Checkout the branch:**
   ```bash
   cd /Users/eyalk/Desktop/team-projects/frogbot
   git checkout fix-gradle-package-handler
   ```

2. **Run tests:**
   ```bash
   go test ./packagehandlers/... -v
   ```

3. **Test with real scan:**
   ```bash
   cd /Users/eyalk/Desktop/fun-projects/gradle-multi-module
   # Run frogbot scan (you'll need to set up JFrog credentials)
   ```

4. **Review changes:**
   - See the commit: `56edfcd3`
   - PR link: https://github.com/eyalk007/frogbot/pull/new/fix-gradle-package-handler

---

## 📚 Key Learnings

1. **Gradle has multiple formats** - Can't assume string format only
2. **Dynamic versions are common** - Need special handling
3. **SBOM is the source of truth** - Use it for accurate version info
4. **Regex is powerful but fragile** - Test thoroughly
5. **Version comparison is complex** - Need smart logic, not just equality

---

## 🤔 Questions for Future

1. Should we support Gradle Kotlin DSL syntax?
2. How do we handle version catalogs (TOML files)?
3. Should we parse the entire Gradle file or just use regex?
4. Can we leverage Gradle's own parsing libraries?

---

**Ready to test!** Just need to run a full scan on the test repo and verify the PR creation. 🎉

