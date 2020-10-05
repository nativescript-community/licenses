import * as path from 'path';
import * as fs from 'fs';
import * as plist from 'plist';
import { exec } from 'child_process';
export default function ($logger, $projectData, hookArgs) {
    return new Promise(function (resolve, reject) {
        const platformFromHookArgs = hookArgs && (hookArgs.platform || (hookArgs.prepareData && hookArgs.prepareData.platform));
        const platform = (platformFromHookArgs || '').toLowerCase();

        /* Handle preparing of Google Services files */
        if (platform === 'android') {
        } else if (platform === 'ios') {
            const licenseUrls = {
                'Apache 2.0': 'http://www.apache.org/licenses/LICENSE-2.0',
                MIT: 'http://www.apache.org/licenses/LICENSE-2.0',
                mit: 'http://www.apache.org/licenses/LICENSE-2.0',
                BSD: 'https://opensource.org/licenses/BSD-3-Clause',
            };
            const metadaFile = fs
                .readdirSync(path.join($projectData.projectDir, 'platforms/ios/Pods'))
                .filter((s) => s.endsWith('-metadata.plist'))[0];
            if (!metadaFile) {
                return reject(new Error('Could not find the Pods metadata file'));
            }
            const obj = plist.parse(fs.readFileSync(metadaFile, 'utf8'));
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
            fs.writeFileSync(path.join($projectData.appDirectoryPath, 'ios/licenses.json'), JSON.stringify(result));
            resolve();
        } else {
            exec(
                './gradlew generateLicenseReport',
                {
                    cwd: path.join($projectData.projectDir, '/platforms/android'),
                },
                function (error, stdout, stderr) {
                    if (error) {
                        reject(error);
                    }
                    resolve();
                }
            );
        }
    });
}
