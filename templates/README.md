# Frogbot GitLab CI Component

GitLab CI/CD Component for JFrog Frogbot security scanning.

## Quick Start

Add to your `.gitlab-ci.yml`:

```yaml
include:
  - component: $CI_SERVER_FQDN/jfrog/frogbot/frogbot@v3
```

Or for GitLab.com:

```yaml
include:
  - component: gitlab.com/jfrog/frogbot/frogbot@v3
```

Set these CI/CD variables in your GitLab project:
- `JF_URL` - Your JFrog Platform URL
- `JF_ACCESS_TOKEN` - JFrog access token (mark as Masked)
- `JF_GIT_TOKEN` - GitLab access token (mark as Masked)

**That's it!** Frogbot will automatically scan PRs and your main branch.

## Features

- ✅ Auto-scans merge requests
- ✅ Auto-scans main branch
- ✅ Supports scheduled scans
- ✅ Comments on MRs with findings
- ✅ Creates fix MRs automatically

## Configuration

### Inputs

```yaml
include:
  - component: gitlab.com/jfrog/frogbot/frogbot@v3
    inputs:
      stage: security  # Default: test
```

### Optional Variables

Add these to customize Frogbot behavior:

```yaml
variables:
  JF_MIN_SEVERITY: "high"
  JF_WATCHES: "my-watch"
  JF_PROJECT: "my-project"
  JF_FIXABLE_ONLY: "TRUE"
  JF_FAIL: "FALSE"
  JF_WORKING_DIR: "backend/"
```

[See all configuration options](https://jfrog.com/help/r/jfrog-security-user-guide/frogbot-optional-configuration-parameters)

### Customize Rules

```yaml
include:
  - component: gitlab.com/jfrog/frogbot/frogbot@v3

# Make MR scans manual
frogbot-pr:
  rules:
    - if: $CI_PIPELINE_SOURCE == 'merge_request_event'
      when: manual
```

### Custom Docker Image

```yaml
include:
  - component: gitlab.com/jfrog/frogbot/frogbot@v3

frogbot-pr:
  image: my-company/custom-image:tag
frogbot-repo:
  image: my-company/custom-image:tag
```

## Examples

### Basic Setup

```yaml
include:
  - component: gitlab.com/jfrog/frogbot/frogbot@v3
```

### With Custom Configuration

```yaml
include:
  - component: gitlab.com/jfrog/frogbot/frogbot@v3

variables:
  JF_MIN_SEVERITY: "critical"
  JF_FIXABLE_ONLY: "TRUE"
```

### Scan Multiple Branches

```yaml
include:
  - component: gitlab.com/jfrog/frogbot/frogbot@v3

frogbot-repo:
  rules:
    - if: $CI_COMMIT_BRANCH =~ /^(main|develop|staging)$/
    - if: $CI_PIPELINE_SOURCE == "schedule"
```

### Enterprise Inheritance

```yaml
include:
  - component: gitlab.com/jfrog/frogbot/frogbot@v3
  - project: 'company/ci-templates'
    file: 'base.yml'

frogbot-pr:
  extends: .company-base
frogbot-repo:
  extends: .company-base
```

## Requirements

- GitLab CI/CD
- JFrog Platform with Xray (v3.29.0+)
- Repository with package manager files

## Documentation

- [Frogbot Documentation](https://docs.jfrog-applications.jfrog.io/jfrog-applications/frogbot)
- [GitLab CI Components](https://docs.gitlab.com/ee/ci/components/)
- [Configuration Parameters](https://jfrog.com/help/r/jfrog-security-user-guide/frogbot-optional-configuration-parameters)

## Support

- [GitHub Issues](https://github.com/jfrog/frogbot/issues)
- [JFrog Support](https://jfrog.com/support/)

## License

Apache-2.0

