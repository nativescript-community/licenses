import * as path from 'path';
import * as fs from 'fs';
import * as plist from 'plist';
import { exec, spawn } from 'child_process';
module.exports = function ($logger, $projectData, hookArgs) {
    return new Promise(function (resolve, reject) {
        const platformFromHookArgs = hookArgs && (hookArgs.platform || (hookArgs.prepareData && hookArgs.prepareData.platform));
        const platform = (platformFromHookArgs || '').toLowerCase();

        /* Handle preparing of Google Services files */
        if (platform === 'android') {
            console.log('generateLicenseReport', $projectData.projectDir);
            const command = spawn('./gradlew', ['generateLicenseReport'], {
                cwd: path.join($projectData.projectDir, 'platforms/android'),
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
        } else if (platform === 'ios') {
            const licenseUrls = {
                'Apache 2.0': 'http://www.apache.org/licenses/LICENSE-2.0',
                MIT: 'http://www.apache.org/licenses/LICENSE-2.0',
                mit: 'http://www.apache.org/licenses/LICENSE-2.0',
                BSD: 'https://opensource.org/licenses/BSD-3-Clause',
            };
            const dirPath = path.join($projectData.projectDir, 'platforms/ios/Pods');
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
            const outPath = path.join($projectData.appDirectoryPath, 'ios');
            if (!fs.existsSync(outPath)) {
                fs.mkdirSync(outPath);
            }
            fs.writeFileSync(path.join(outPath, 'licenses.json'), JSON.stringify(result));
            resolve();
        }
    });
};
