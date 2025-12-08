import { Utils } from '../src/utils';

describe('Frogbot Azure Extension', () => {
    describe('Utils', () => {
        it('should get correct architecture for Windows', () => {
            const originalPlatform = process.platform;
            Object.defineProperty(process, 'platform', {
                value: 'win32'
            });

            const arch = Utils.getArchitecture();
            expect(arch).toBe('windows-amd64');

            Object.defineProperty(process, 'platform', {
                value: originalPlatform
            });
        });

        it('should get correct executable name for Windows', () => {
            const originalPlatform = process.platform;
            Object.defineProperty(process, 'platform', {
                value: 'win32'
            });

            const execName = Utils.getExecutableName();
            expect(execName).toBe('frogbot.exe');

            Object.defineProperty(process, 'platform', {
                value: originalPlatform
            });
        });

        it('should get correct executable name for Unix', () => {
            const originalPlatform = process.platform;
            Object.defineProperty(process, 'platform', {
                value: 'linux'
            });

            const execName = Utils.getExecutableName();
            expect(execName).toBe('frogbot');

            Object.defineProperty(process, 'platform', {
                value: originalPlatform
            });
        });

        it('should generate correct CLI URL for releases.jfrog.io', () => {
            const url = Utils.getCliUrl('2', '[RELEASE]', 'frogbot', '');
            expect(url).toContain('https://releases.jfrog.io/artifactory/frogbot/v2/[RELEASE]/');
            expect(url).toContain('frogbot');
        });

        it('should generate auth string for releases repo with access token', () => {
            process.env.JF_ACCESS_TOKEN = 'test-token';
            const auth = Utils.generateAuthString('my-releases-repo');
            expect(auth).toContain('Bearer');
            delete process.env.JF_ACCESS_TOKEN;
        });

        it('should return empty auth string when no releases repo', () => {
            const auth = Utils.generateAuthString('');
            expect(auth).toBe('');
        });
    });
});
