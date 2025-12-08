# Frogbot Security Scanner

**JFrog Frogbot** is a Git bot that scans your pull requests and repositories for security vulnerabilities.

## Features

- 🔍 **Automatic Scanning** - Scans PRs and repositories automatically
- 🔐 **Vulnerability Detection** - Identifies security issues in dependencies
- 🤖 **Auto-Fix** - Creates fix pull requests automatically
- ⚡ **Fast & Simple** - Just a few lines of configuration

## Quick Start

Add to your `azure-pipelines.yml`:

```yaml
trigger:
  branches:
    include: [main]
pr:
  branches:
    include: ['*']

steps:
  - task: FrogbotSecurityScan@1
```

Set these pipeline variables:
- `JF_URL` - Your JFrog Platform URL (e.g., `https://mycompany.jfrog.io`)
- `JF_ACCESS_TOKEN` - JFrog access token with Xray permissions (mark as secret)

**That's it!** Frogbot will automatically:
- ✅ Scan pull requests when opened/updated
- ✅ Scan your main branch on every push
- ✅ Comment on PRs with vulnerability findings
- ✅ Create fix PRs for vulnerabilities

## Configuration

### Optional Inputs

```yaml
- task: FrogbotSecurityScan@1
  inputs:
    version: 'latest'           # Frogbot version (default: latest)
    oidcProviderName: ''        # OIDC provider name (optional)
    oidcAudience: ''            # OIDC audience (optional)
```

### Optional Environment Variables

Add these as pipeline variables to customize Frogbot behavior:

| Variable | Description | Example |
|----------|-------------|---------|
| `JF_MIN_SEVERITY` | Minimum severity to report | `high` |
| `JF_WATCHES` | Xray watches to use | `my-watch` |
| `JF_PROJECT` | JFrog project key | `my-project` |
| `JF_FIXABLE_ONLY` | Only report fixable issues | `TRUE` |
| `JF_FAIL` | Fail pipeline on issues | `FALSE` |
| `JF_WORKING_DIR` | Working directory | `backend/` |

[See full list of configuration options](https://jfrog.com/help/r/jfrog-security-user-guide/frogbot-optional-configuration-parameters)

## How It Works

1. **On Pull Requests**: Frogbot scans code changes and comments with vulnerability findings
2. **On Main Branch**: Frogbot scans the entire repository and can create fix PRs
3. **Auto-Fix**: Frogbot automatically creates PRs with dependency upgrades to fix vulnerabilities

## Requirements

- Azure DevOps Pipelines
- JFrog Platform with Xray (version 3.29.0+)
- Repository with package manager files (npm, Maven, Go, etc.)

## Support

- [Frogbot Documentation](https://docs.jfrog-applications.jfrog.io/jfrog-applications/frogbot)
- [JFrog Support](https://jfrog.com/support/)
- [GitHub Issues](https://github.com/jfrog/frogbot/issues)

## Example Pipelines

### Basic Setup

```yaml
trigger:
  branches:
    include: [main]
pr:
  branches:
    include: ['*']

steps:
  - task: FrogbotSecurityScan@1
```

### With Custom Configuration

```yaml
trigger:
  branches:
    include: [main]
pr:
  branches:
    include: ['*']

variables:
  JF_MIN_SEVERITY: 'high'
  JF_FIXABLE_ONLY: 'TRUE'

steps:
  - task: FrogbotSecurityScan@1
    inputs:
      version: '2.29.2'
```

## License

Apache-2.0 License - See [LICENSE](https://github.com/jfrog/frogbot/blob/main/LICENSE)

