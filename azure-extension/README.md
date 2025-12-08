# Frogbot Azure DevOps Extension

JFrog Frogbot Azure DevOps Extension for scanning pull requests and repositories for security vulnerabilities.

## Features

- 🔍 Automatic vulnerability scanning
- 🔀 PR and repository scanning
- 🤖 Auto-fix pull requests
- ⚡ Simple integration

## Usage

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
    inputs:
      version: 'latest'  # Optional: specify Frogbot version
```

## Prerequisites

Set these pipeline variables:
- `JF_URL` - Your JFrog Platform URL
- `JF_ACCESS_TOKEN` - JFrog access token (mark as secret)

## Development

### Build

```bash
npm install
npm run build
```

### Test

```bash
npm test
```

### Package

```bash
npm run package
```

This creates a `.vsix` file ready for publishing.

## License

Apache-2.0

