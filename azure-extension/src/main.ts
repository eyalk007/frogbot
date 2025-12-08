import * as tl from 'azure-pipelines-task-lib/task';
import { Utils } from './utils';

async function main() {
    try {
        tl.setResourcePath(tl.resolve(__dirname, '..', 'task.json'));
        
        console.log('Starting Frogbot Security Scan');
        
        const jfrogUrl: string = await Utils.getJfrogPlatformUrl();
        await Utils.setupOidcTokenIfNeeded(jfrogUrl);
        
        const buildReason: string = await Utils.setFrogbotEnv();
        await Utils.addToPath();
        
        // Determine scan type based on build reason
        switch (buildReason) {
            case 'PullRequest':
                await Utils.execScanPullRequest();
                break;
            case 'IndividualCI':
            case 'BatchedCI':
            case 'Schedule':
            case 'Manual':
                await Utils.execCreateFixPullRequests();
                break;
            default:
                tl.setResult(tl.TaskResult.Failed, buildReason + ' build reason is not supported by Frogbot');
        }
        
        console.log('Frogbot scan completed successfully');
    } catch (error: any) {
        tl.setResult(tl.TaskResult.Failed, error.message || 'Unknown error occurred');
    }
}

main();

