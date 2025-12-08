# Publishing Frogbot as a GitLab CI Component

This guide explains how to publish Frogbot to the GitLab CI/CD Component Catalog.

## Prerequisites

1. Repository must be on **GitLab.com** or **GitLab self-managed** (not GitHub)
2. Repository must be **public** (for public catalog) or **internal** (for organization)
3. Repository must have a **description**
4. Repository must have a **README.md**

## Component Structure

```
frogbot/
├── templates/           # Component directory (REQUIRED)
│   ├── frogbot.yml     # The component
│   └── README.md       # Component documentation
├── README.md           # Project README
└── CHANGELOG.md        # Optional but recommended
```

✅ **Already created!**

## Enable CI/CD Catalog

1. Go to **Settings → General** in GitLab
2. Expand **Visibility, project features, permissions**
3. Enable **CI/CD Catalog project** toggle
4. Save changes

## Publish a Release

Components are published through **GitLab Releases**:

```bash
# Tag a version
git tag v3.0.0
git push origin v3.0.0

# Or create release in GitLab UI:
# Repository → Releases → New Release
# - Tag: v3.0.0
# - Release title: v3.0.0
# - Description: (changelog)
```

**That's it!** The component is now available in the CI/CD Catalog.

## User Experience

### Before (Remote Include)

```yaml
include:
  - remote: 'https://raw.githubusercontent.com/jfrog/frogbot/v3/docs/templates/gitlab/frogbot.yml'
```

### After (Component)

```yaml
include:
  - component: $CI_SERVER_FQDN/jfrog/frogbot/frogbot@v3
```

Or for GitLab.com:

```yaml
include:
  - component: gitlab.com/jfrog/frogbot/frogbot@v3
```

## Version Management

Components use GitLab releases/tags:

```yaml
# Latest version
- component: gitlab.com/jfrog/frogbot/frogbot@~latest

# Specific version
- component: gitlab.com/jfrog/frogbot/frogbot@v3.0.0

# Semantic versioning
- component: gitlab.com/jfrog/frogbot/frogbot@~3  # Latest 3.x.x
```

## Discovery

Once published, users can find Frogbot in:
1. **GitLab CI/CD Catalog** - Browse/search components
2. **GitLab Pipeline Editor** - Auto-suggestions
3. **Component documentation** - In-catalog docs

## Differences from Remote Include

| Feature | Remote Include | Component |
|---------|---------------|-----------|
| Syntax | Long URL | Short reference |
| Discovery | Manual | Searchable catalog |
| Versioning | Manual URL | Built-in semver |
| Documentation | External | In-catalog |
| Updates | Users update URL | Users update version |

## Migration Path

1. **Phase 1** (Now): Support both
   - Remote include (GitHub) - for GitHub users
   - Component (GitLab) - for GitLab users

2. **Phase 2** (Future): Recommend component
   - Update docs to prefer component
   - Keep remote include as fallback

3. **Phase 3** (Later): Component primary
   - Remote include for legacy only

## Testing

To test before publishing:

```yaml
include:
  - component: $CI_SERVER_FQDN/jfrog/frogbot/frogbot@main
```

This uses the `main` branch instead of a release.

## Resources

- [GitLab CI Components Docs](https://docs.gitlab.com/ee/ci/components/)
- [CI/CD Catalog](https://docs.gitlab.com/ee/ci/components/#cicd-catalog)
- [Component Inputs](https://docs.gitlab.com/ee/ci/components/#component-inputs)

