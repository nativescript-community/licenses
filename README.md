[npm-image]: http://img.shields.io/npm/v/@nativescript-community/licenses.svg
[npm-url]: https://npmjs.org/package/@nativescript-community/licenses
[downloads-image]: http://img.shields.io/npm/dm/@nativescript-community/licenses.svg

This plugin is a plugin to easily integrate licenses used your apps.
The plugin will automatically generate `licenses.json`
You simply need to load the `licenses.json` from anywhere in your app using either `require('licenses.json')` or `require('~/licenses.json')`
You can then simply `require` that file to use it in your app.
Here is an example JSON file format (`moduleDescription` not present on Android):

```json
{
    "dependencies": [
        {
            "moduleName": "com.airbnb.android:lottie",
            "moduleDescription": "description",
            "moduleUrl": "https://github.com/airbnb/lottie-android",
            "moduleVersion": "3.4.2",
            "moduleLicense": "Apache License, Version 2.0",
            "moduleLicenseUrl": "https://www.apache.org/licenses/LICENSE-2.0"
        }
    ]
}
```
