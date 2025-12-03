# Frogbot Security Scan - Jenkins Pipeline Template

## Overview

Use Frogbot in your Jenkins pipelines with minimal configuration. The Jenkins JFrog Plugin provides built-in Frogbot support with automatic environment variable detection.

---

## Prerequisites

1. **Jenkins** with the [JFrog Plugin](https://plugins.jenkins.io/jfrog/) installed
2. **JFrog Platform** instance configured in Jenkins (Settings → Configure System → JFrog Platform)
3. **Git provider** credentials stored in Jenkins

---

## Minimal Setup

### Step 1: Configure JFrog Platform in Jenkins UI

**One-time setup:**
1. Go to **Manage Jenkins → Configure System**
2. Find **JFrog Platform** section
3. Add your JFrog Platform instance:
   - **Server ID:** `my-jfrog`
   - **URL:** `https://mycompany.jfrog.io`
   - **Credentials:** Your JFrog access token

This automatically configures `JF_URL` and `JF_ACCESS_TOKEN` for all pipelines.

---

### Step 2: Store Git Credentials

**In Jenkins UI:**
1. Go to **Manage Jenkins → Manage Credentials**
2. Add credentials:
   - **For GitHub/GitLab/Azure:** Secret text with your Git token
   - **For Bitbucket Server:** Username with password

---

### Step 3: Add to Your Jenkinsfile

```groovy
pipeline {
    agent any
    
    environment {
        JF_GIT_PROVIDER = 'github'  // or 'gitlab', 'bitbucketServer', 'azureRepos'
        JF_GIT_OWNER = 'jfrog'
        JF_GIT_REPO = 'frogbot'
    }
    
    stages {
        stage('Frogbot Scan') {
            steps {
                withCredentials([
                    string(credentialsId: 'git-token', variable: 'JF_GIT_TOKEN')
                ]) {
                    frogbot 'scan-pull-request'
                }
            }
        }
    }
}
```

**That's it!** This will:
- Scan pull requests automatically
- Auto-detect PR number and target branch
- Use your configured JFrog Platform instance

---

## What's Auto-Configured?

The Jenkins plugin automatically sets:

| Variable | Source | When |
|----------|--------|------|
| `JF_URL` | Jenkins Global Config | Always |
| `JF_ACCESS_TOKEN` | Jenkins Global Config | Always |
| `JF_GIT_PULL_REQUEST_ID` | `$CHANGE_ID` | PR builds only |
| `JF_GIT_BASE_BRANCH` | `$CHANGE_TARGET` or `$BRANCH_NAME` | Always |

**You don't need to set these!**

---

## Complete Examples

### GitHub - Scan PRs and Repository

```groovy
pipeline {
    agent any
    
    environment {
        JF_GIT_PROVIDER = 'github'
        JF_GIT_OWNER = 'jfrog'
        JF_GIT_REPO = 'frogbot'
    }
    
    stages {
        stage('Frogbot Scan') {
            steps {
                script {
                    withCredentials([
                        string(credentialsId: 'github-token', variable: 'JF_GIT_TOKEN')
                    ]) {
                        // Auto-detect: scan PRs or repository
                        def scanType = env.CHANGE_ID ? 'scan-pull-request' : 'scan-repository'
                        frogbot scanType
                    }
                }
            }
        }
    }
}
```

---

### GitLab with Custom Settings

```groovy
pipeline {
    agent any
    
    environment {
        JF_GIT_PROVIDER = 'gitlab'
        JF_GIT_OWNER = 'mygroup'
        JF_GIT_REPO = 'myproject'
        
        // Optional: Custom Frogbot flags
        JF_MIN_SEVERITY = 'high'
        JF_FIXABLE_ONLY = 'TRUE'
        JF_FAIL = 'FALSE'
    }
    
    stages {
        stage('Frogbot Scan') {
            steps {
                withCredentials([
                    string(credentialsId: 'gitlab-token', variable: 'JF_GIT_TOKEN')
                ]) {
                    frogbot 'scan-pull-request'
                }
            }
        }
    }
}
```

---

### Azure DevOps

```groovy
pipeline {
    agent any
    
    environment {
        JF_GIT_PROVIDER = 'azureRepos'
        JF_GIT_OWNER = 'myorganization'
        JF_GIT_PROJECT = 'myproject'  // Azure-specific
        JF_GIT_REPO = 'myrepo'
    }
    
    stages {
        stage('Frogbot Scan') {
            steps {
                withCredentials([
                    string(credentialsId: 'azure-pat', variable: 'JF_GIT_TOKEN')
                ]) {
                    frogbot 'scan-pull-request'
                }
            }
        }
    }
}
```

---

### Bitbucket Server

```groovy
pipeline {
    agent any
    
    environment {
        JF_GIT_PROVIDER = 'bitbucketServer'
        JF_GIT_OWNER = 'PROJECT_KEY'
        JF_GIT_REPO = 'repo-slug'
        JF_GIT_API_ENDPOINT = 'https://bitbucket.mycompany.com'
    }
    
    stages {
        stage('Frogbot Scan') {
            steps {
                // Bitbucket requires both username and token
                withCredentials([
                    usernamePassword(
                        credentialsId: 'bitbucket-creds',
                        usernameVariable: 'JF_GIT_USERNAME',
                        passwordVariable: 'JF_GIT_TOKEN'
                    )
                ]) {
                    frogbot 'scan-pull-request'
                }
            }
        }
    }
}
```

**Note:** For Bitbucket Server, create credentials as **Username with password** type, not **Secret text**.

---

## Optional Configuration

Add any Frogbot environment variable:

```groovy
environment {
    // Security settings
    JF_MIN_SEVERITY = 'high'              // Only High/Critical vulnerabilities
    JF_FIXABLE_ONLY = 'TRUE'              // Only fixable issues
    JF_FAIL = 'FALSE'                     // Don't fail build
    
    // Xray settings
    JF_WATCHES = 'my-watch'               // Specific Xray watch
    JF_PROJECT = 'my-project'             // JFrog project
    
    // Scanning options
    JF_WORKING_DIR = 'backend/'           // Scan subdirectory
    JF_INCLUDE_ALL_VULNERABILITIES = 'TRUE'
}
```

See full list: [Frogbot Configuration Parameters](https://jfrog.com/help/r/jfrog-security-user-guide/frogbot-optional-configuration-parameters)

---

## Advanced: Scan Multiple Repositories in Parallel

```groovy
pipeline {
    agent any
    
    environment {
        JF_GIT_PROVIDER = 'github'
        JF_GIT_OWNER = 'jfrog'
    }
    
    stages {
        stage('Scan Multiple Repos') {
            parallel {
                stage('Scan Frogbot') {
                    steps {
                        script {
                            env.JF_GIT_REPO = 'frogbot'
                            withCredentials([
                                string(credentialsId: 'git-token', variable: 'JF_GIT_TOKEN')
                            ]) {
                                frogbot 'scan-repository'
                            }
                        }
                    }
                }
                stage('Scan JFrog CLI') {
                    steps {
                        script {
                            env.JF_GIT_REPO = 'jfrog-cli'
                            withCredentials([
                                string(credentialsId: 'git-token', variable: 'JF_GIT_TOKEN')
                            ]) {
                                frogbot 'scan-repository'
                            }
                        }
                    }
                }
            }
        }
    }
}
```

All repositories scan simultaneously in parallel!

---

## Multibranch Pipeline

Works seamlessly with Multibranch Pipelines:

```groovy
pipeline {
    agent any
    
    environment {
        JF_GIT_PROVIDER = 'github'
        JF_GIT_OWNER = 'jfrog'
        JF_GIT_REPO = 'frogbot'
    }
    
    stages {
        stage('Frogbot Scan') {
            steps {
                withCredentials([
                    string(credentialsId: 'git-token', variable: 'JF_GIT_TOKEN')
                ]) {
                    script {
                        def scanType = env.CHANGE_ID ? 'scan-pull-request' : 'scan-repository'
                        frogbot scanType
                    }
                }
            }
        }
    }
}
```

The plugin auto-detects PR vs branch builds and sets variables accordingly.

---

## Migration from Shell Script

### Before (15+ lines)

```groovy
stage('Frogbot') {
    steps {
        script {
            env.JF_URL = 'https://mycompany.jfrog.io'
            env.JF_GIT_PROVIDER = 'github'
            env.JF_GIT_OWNER = 'jfrog'
            env.JF_GIT_REPO = 'frogbot'
            env.JF_GIT_PULL_REQUEST_ID = env.CHANGE_ID
            env.JF_GIT_BASE_BRANCH = env.CHANGE_TARGET ?: env.BRANCH_NAME
            
            withCredentials([
                string(credentialsId: 'jfrog-token', variable: 'JF_ACCESS_TOKEN'),
                string(credentialsId: 'git-token', variable: 'JF_GIT_TOKEN')
            ]) {
                sh '''
                    curl -fLg "https://releases.jfrog.io/artifactory/frogbot/v2/[RELEASE]/getFrogbot.sh" | sh
                    ./frogbot scan-pull-request
                '''
            }
        }
    }
}
```

### After (5 lines)

```groovy
stage('Frogbot') {
    steps {
        withCredentials([
            string(credentialsId: 'git-token', variable: 'JF_GIT_TOKEN')
        ]) {
            frogbot 'scan-pull-request'
        }
    }
}
```

**70% less code!** ✅

---

## Troubleshooting

### "No JFrog Platform instance configured"

**Solution:** Configure JFrog Platform in **Manage Jenkins → Configure System → JFrog Platform**.

---

### "Missing JF_GIT_TOKEN"

**Solution:** Add `withCredentials()` block with your Git token.

---

### "Missing JF_GIT_OWNER or JF_GIT_REPO"

**Solution:** Set in `environment` block:
```groovy
environment {
    JF_GIT_OWNER = 'your-org'
    JF_GIT_REPO = 'your-repo'
}
```

---

## Additional Resources

- **Jenkins JFrog Plugin:** https://plugins.jenkins.io/jfrog/
- **Frogbot Documentation:** https://docs.jfrog-applications.jfrog.io/jfrog-applications/frogbot
- **Configuration Parameters:** https://jfrog.com/help/r/jfrog-security-user-guide/frogbot-optional-configuration-parameters

---

## Installation

Install the JFrog Plugin from Jenkins:
1. Go to **Manage Jenkins → Manage Plugins**
2. Search for "JFrog"
3. Install "JFrog Plugin"
4. Restart Jenkins

Or install manually: https://plugins.jenkins.io/jfrog/

---

**Happy Scanning!** 🐸🔒

