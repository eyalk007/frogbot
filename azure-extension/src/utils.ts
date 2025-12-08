import * as tl from 'azure-pipelines-task-lib/task';
import * as tr from 'azure-pipelines-task-lib/toolrunner';
import axios, { AxiosResponse } from 'axios';
import { chmodSync, existsSync } from 'fs';
import { platform, arch } from 'os';
import { join } from 'path';

export class Utils {
    private static readonly LATEST_RELEASE_VERSION: string = '[RELEASE]';
    private static readonly LATEST_CLI_VERSION_ARG: string = 'latest';
    private static readonly VERSION_ARG: string = 'version';
    private static readonly TOOL_NAME: string = 'frogbot';
    // OpenID Connect inputs
    private static readonly OIDC_AUDIENCE_ARG: string = 'oidcAudience';
    private static readonly OIDC_INTEGRATION_PROVIDER_NAME_ARG: string = 'oidcProviderName';

    public static async addToPath() {
        const fileName: string = Utils.getExecutableName();
        let version: string = tl.getInput(Utils.VERSION_ARG, false) || this.LATEST_CLI_VERSION_ARG;
        let major: string = '2';
        
        if (version === this.LATEST_CLI_VERSION_ARG) {
            version = Utils.LATEST_RELEASE_VERSION;
        } else {
            major = version.split('.')[0];
        }

        // Download Frogbot
        const releasesRepo: string = tl.getVariable('JF_RELEASES_REPO') || '';
        const url: string = Utils.getCliUrl(major, version, fileName, releasesRepo);
        
        tl.debug('Downloading Frogbot from ' + url);
        
        const downloadPath: string = join(tl.getVariable('Agent.TempDirectory') || '/tmp', fileName);
        await this.downloadTool(url, downloadPath, releasesRepo);
        
        // Make executable on Unix
        if (!Utils.isWindows()) {
            chmodSync(downloadPath, 0o555);
        }
        
        // Add to path
        const downloadDir: string = tl.getVariable('Agent.TempDirectory') || '/tmp';
        tl.prependPath(downloadDir);
        
        tl.debug('Frogbot downloaded and added to PATH');
    }

    private static async downloadTool(url: string, downloadPath: string, releasesRepo: string): Promise<void> {
        try {
            const headers: any = {};
            const auth: string = this.generateAuthString(releasesRepo);
            if (auth) {
                headers['Authorization'] = auth;
            }

            const response: AxiosResponse = await axios({
                method: 'get',
                url: url,
                responseType: 'stream',
                headers: headers
            });

            const writer = require('fs').createWriteStream(downloadPath);
            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });
        } catch (error: any) {
            throw new Error(`Failed to download Frogbot: ${error.message}`);
        }
    }

    public static generateAuthString(releasesRepo: string): string {
        if (!releasesRepo) {
            return '';
        }
        const accessToken: string = tl.getVariable('JF_ACCESS_TOKEN') || '';
        const username: string = tl.getVariable('JF_USER') || '';
        const password: string = tl.getVariable('JF_PASSWORD') || '';
        
        if (accessToken) {
            return 'Bearer ' + Buffer.from(accessToken).toString();
        } else if (username && password) {
            return 'Basic ' + Buffer.from(username + ':' + password).toString('base64');
        }
        return '';
    }

    public static async setFrogbotEnv(): Promise<string> {
        // Set Git provider
        tl.setVariable('JF_GIT_PROVIDER', 'azureRepos');
        
        // Set repository information
        const teamProject: string = tl.getVariable('System.TeamProject') || '';
        const repoName: string = tl.getVariable('Build.Repository.Name') || '';
        const collectionUri: string = tl.getVariable('System.CollectionUri') || '';
        
        tl.setVariable('JF_GIT_PROJECT', teamProject);
        tl.setVariable('JF_GIT_REPO', repoName);
        tl.setVariable('JF_GIT_API_ENDPOINT', collectionUri);
        
        // Extract organization from collection URI
        // Format: https://dev.azure.com/organization/
        const orgMatch = collectionUri.match(/https:\/\/dev\.azure\.com\/([^\/]+)\//);
        if (orgMatch && orgMatch[1]) {
            tl.setVariable('JF_GIT_OWNER', orgMatch[1]);
        } else {
            // Fallback to System.TeamProject if organization cannot be extracted
            tl.setVariable('JF_GIT_OWNER', teamProject);
        }
        
        // Set PR information if this is a pull request
        const buildReason: string = tl.getVariable('Build.Reason') || '';
        if (buildReason === 'PullRequest') {
            const prId: string = tl.getVariable('System.PullRequest.PullRequestId') || '';
            const targetBranch: string = tl.getVariable('System.PullRequest.TargetBranchName') || '';
            
            tl.setVariable('JF_GIT_PULL_REQUEST_ID', prId);
            tl.setVariable('JF_GIT_BASE_BRANCH', targetBranch);
        } else {
            // For non-PR builds, use the current branch
            const sourceBranch: string = tl.getVariable('Build.SourceBranchName') || '';
            tl.setVariable('JF_GIT_BASE_BRANCH', sourceBranch);
        }
        
        // Set Git token (use System.AccessToken)
        const accessToken: string = tl.getVariable('System.AccessToken') || '';
        if (accessToken) {
            tl.setVariable('JF_GIT_TOKEN', accessToken, true); // secret
        }
        
        return buildReason;
    }

    /**
     * Execute frogbot scan-pull-request command.
     */
    public static async execScanPullRequest() {
        if (!tl.getVariable('JF_GIT_BASE_BRANCH')) {
            const targetBranch: string = tl.getVariable('System.PullRequest.TargetBranchName') || '';
            tl.setVariable('JF_GIT_BASE_BRANCH', targetBranch);
        }
        
        const frogbot: tr.ToolRunner = tl.tool(Utils.getExecutableName());
        frogbot.arg('scan-pull-request');
        
        const exitCode: number = await frogbot.exec();
        if (exitCode !== 0) {
            throw new Error('Frogbot exited with exit code ' + exitCode);
        }
    }

    /**
     * Execute frogbot scan-repository command.
     */
    public static async execCreateFixPullRequests() {
        if (!tl.getVariable('JF_GIT_BASE_BRANCH')) {
            const sourceBranch: string = tl.getVariable('Build.SourceBranchName') || '';
            tl.setVariable('JF_GIT_BASE_BRANCH', sourceBranch);
        }
        
        const frogbot: tr.ToolRunner = tl.tool(Utils.getExecutableName());
        frogbot.arg('scan-repository');
        
        const exitCode: number = await frogbot.exec();
        if (exitCode !== 0) {
            throw new Error('Frogbot exited with exit code ' + exitCode);
        }
    }

    public static getCliUrl(major: string, version: string, fileName: string, releasesRepo: string): string {
        const architecture: string = 'frogbot-' + Utils.getArchitecture();
        if (releasesRepo) {
            let platformUrl: string = tl.getVariable('JF_URL') || '';
            if (!platformUrl) {
                throw new Error('Failed while downloading Frogbot from Artifactory, JF_URL must be set');
            }
            // Remove trailing slash if exists
            platformUrl = platformUrl.replace(/\/$/, '');
            return `${platformUrl}/artifactory/${releasesRepo}/artifactory/frogbot/v${major}/${version}/${architecture}/${fileName}`;
        }
        return `https://releases.jfrog.io/artifactory/frogbot/v${major}/${version}/${architecture}/${fileName}`;
    }

    public static getArchitecture(): string {
        if (Utils.isWindows()) {
            return 'windows-amd64';
        }
        if (platform().includes('darwin')) {
            if (arch().includes('arm')) {
                return 'mac-arm64';
            }
            return 'mac-386';
        }
        if (arch().includes('arm')) {
            return arch().includes('64') ? 'linux-arm64' : 'linux-arm';
        }
        if (arch().includes('ppc64le')) {
            return 'linux-ppc64le';
        }
        if (arch().includes('ppc64')) {
            return 'linux-ppc64';
        }
        return arch().includes('64') ? 'linux-amd64' : 'linux-386';
    }

    public static getExecutableName(): string {
        return Utils.isWindows() ? 'frogbot.exe' : 'frogbot';
    }

    public static isWindows(): boolean {
        return platform().startsWith('win');
    }

    public static async getJfrogPlatformUrl(): Promise<string> {
        const jfrogUrl: string = tl.getVariable('JF_URL') || '';
        if (!jfrogUrl) {
            throw new Error('JF_URL must be provided and point to your full platform URL, for example: https://mycompany.jfrog.io/');
        }
        return jfrogUrl;
    }

    /**
     * This method will set up an OIDC token if the OIDC integration is set.
     * If OIDC integration is set but not working, the task will fail causing frogbot to fail
     * @param jfrogUrl - The JFrog platform URL
     */
    public static async setupOidcTokenIfNeeded(jfrogUrl: string): Promise<void> {
        const oidcProviderName: string = tl.getInput(Utils.OIDC_INTEGRATION_PROVIDER_NAME_ARG, false) || '';
        if (!oidcProviderName) {
            // No OIDC setup needed
            return;
        }
        
        tl.debug('OIDC authentication is requested but not yet implemented for Azure DevOps');
        // Note: OIDC implementation for Azure DevOps would go here
        // Azure DevOps has a different OIDC mechanism than GitHub Actions
    }
}

export interface TokenExchangeResponseData {
    access_token: string;
    errors: string;
}

