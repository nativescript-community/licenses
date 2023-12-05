import * as path from 'path';
import * as fs from 'fs';
import * as plist from 'plist';
import { exec, spawn } from 'child_process';

function getPlatformData(platformData, projectData, platform: string, injector) {
    if (!platformData) {
        // Used in CLI 5.4.x and below:
        const platformsData = injector.resolve('platformsData');
        platformData = platformsData.getPlatformData(platform, projectData);
    }
    return platformData;
}

module.exports = function ($logger, projectData, injector, hookArgs) {
    return new Promise<void>(function (resolve, reject) {
        const platformName = (
            (hookArgs && hookArgs.platformData && hookArgs.platformData.normalizedPlatformName) ||
            (hookArgs.checkForChangesOpts && hookArgs.checkForChangesOpts.platform) ||
            ''
        ).toLowerCase();

        projectData =
            hookArgs && (hookArgs.projectData || (hookArgs.checkForChangesOpts && hookArgs.checkForChangesOpts.projectData));

        const platformData = getPlatformData(hookArgs && hookArgs.platformData, projectData, platformName, injector);

        /* Handle preparing of Google Services files */
        const cwd = platformData.projectRoot;
        const options = platformData.platformProjectService.$options;
        if (platformName === 'android') {
            const projectFilesPath = path.join(platformData.appDestinationDirectoryPath, 'app');
            const fileName = 'licenses.json';
            // console.log('generateLicenseReport', projectData.projectDir, projectFilesPath);
            let command = options.gradlePath || (process.platform === 'win32' ? 'gradlew.bat' : './gradlew');
            if (command.charAt(0) === '.') {
                // resolve relative paths to full paths to avoid node Spawn ENOENT errors on some setups.
                command = path.resolve(cwd, command);
            }
            const spawnCommand = spawn(command, ['generateLicenseReport', '--rerun-tasks', `-PprojectRoot=${projectData.projectDir}`,
			`-DprojectRoot=${projectData.projectDir}`], {
                cwd,
                env: Object.assign({}, process.env, {
                    LICENSES_BUILD_PATH: process.env.LICENSES_BUILD_PATH || path.join(cwd, 'licenses'),
                    LICENSES_OUTPUT_PATH: process.env.LICENSES_OUTPUT_PATH || projectFilesPath,
                    LICENSES_FILE_NAME: process.env.LICENSES_FILE_NAME || fileName,
                }),
            });

            spawnCommand.stdout.on('data', (data) => {
                $logger.debug('@nativescript-community/licenses: ' + data);
            });

            spawnCommand.stderr.on('data', (data) => {
                $logger.error('@nativescript-community/licenses: ' + data);
            });

            spawnCommand.on('close', (code) => {
                $logger.debug(`generateLicenseReport process exited with code ${code}`);
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error('generateLicenseReport failed'));
                }
            });
        } else if (platformName === 'ios') {
            const licenseUrls = {
                'Apache 2.0': 'http://www.apache.org/licenses/LICENSE-2.0',
                MIT: 'http://www.apache.org/licenses/LICENSE-2.0',
                mit: 'http://www.apache.org/licenses/LICENSE-2.0',
                BSD: 'https://opensource.org/licenses/BSD-3-Clause',
            };
            const dirPath = path.join(cwd, 'Pods');
            const metadaFile = fs.readdirSync(dirPath).filter((s) => s.endsWith('-metadata.plist'))[0];
            if (!metadaFile) {
                return reject(new Error('Could not find the Pods metadata file'));
            }
            const obj = (plist as any).parse(fs.readFileSync(path.join(dirPath, metadaFile), 'utf8'));
            const result = {
                dependencies: obj.specs.map((spec) => ({
                    moduleName: spec.name,
                    moduleDescription: spec.summary,
                    moduleVersion: spec.version,
                    moduleLicense: spec.licenseType,
                    moduleUrl: spec.homepage,
                    moduleLicenseUrl: licenseUrls[spec.licenseType],
                })),
            };
            const outPath = path.join(platformData.appDestinationDirectoryPath, 'app');
            // console.log('generateLicenseReport', outPath);
            // const outPath = path.join(projectData.appDirectoryPath, 'ios');
            if (!fs.existsSync(outPath)) {
                fs.mkdirSync(outPath);
            }
            fs.writeFileSync(path.join(outPath, 'licenses.json'), JSON.stringify(result));
            resolve();
        }
    });
};
