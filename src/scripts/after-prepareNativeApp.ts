import * as path from 'path';
import * as fs from 'fs';
import * as plist from 'plist';
import { exec, spawn } from 'child_process';

function getPlatformData(
    platformData,
    projectData,
    platform: string,
    injector
) {
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
        if (platformName === 'android') {
            const platformsData = hookArgs.platformsData;
            const projectFilesPath = path.join(platformData.appDestinationDirectoryPath, 'app');
            // console.log('generateLicenseReport', projectData.projectDir, projectFilesPath);
            const command = spawn(process.platform === 'win32' ? 'gradlew.bat' : './gradlew', ['generateLicenseReport', '--rerun-tasks'], {
                cwd: path.join(projectData.projectDir, 'platforms/android'),
                env:Object.assign(process.env, {
                    LICENSES_OUTPUT_PATH:process.env.LICENSES_OUTPUT_PATH || projectFilesPath
                })
            });

            command.stdout.on('data', (data) => {
                $logger.info('@nativescript-community/licenses: ' + data);
            });

            command.stderr.on('data', (data) => {
                $logger.error('@nativescript-community/licenses: ' + data);
            });

            command.on('close', (code) => {
                console.log(`child process exited with code ${code}`);
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
            const dirPath = path.join(projectData.projectDir, 'platforms/ios/Pods');
            const metadaFile = fs.readdirSync(dirPath).filter((s) => s.endsWith('-metadata.plist'))[0];
            if (!metadaFile) {
                return reject(new Error('Could not find the Pods metadata file'));
            }
            const obj = plist.parse(fs.readFileSync(path.join(dirPath, metadaFile), 'utf8'));
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
