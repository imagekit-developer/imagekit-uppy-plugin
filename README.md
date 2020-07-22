
# ImageKit.io plugin for Uppy upload widget
[![npm version](https://img.shields.io/npm/v/imagekit-uppy-plugin)](https://www.npmjs.com/package/imagekit-uppy-plugin)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Twitter Follow](https://img.shields.io/twitter/follow/imagekitio?label=Follow&style=social)](https://twitter.com/ImagekitIo)

A plugin for [Uppy](https://github.com/transloadit/uppy), which allows you to upload files directly to ImageKit.io media library.

<img src="/assets/imagekit-uppy-demo.gif">

# Getting started
You can see a hosted demo of using this plugin in a real project [here](https://066dn.sse.codesandbox.io) or [fork sample project codesandbox.io](https://codesandbox.io/s/github/imagekit-samples/uppy-uploader).

* [Sample project](https://github.com/imagekit-samples/uppy-uploader) using this plugin with Dropbox, Drive and Facebook upload options.
* A step by step walkthrough of sample project is available at https://docs.imagekit.io/sample-projects/upload-widget/uppy-upload-widget/.
* ImageKit.io [Upload API](https://docs.imagekit.io/api-reference/upload-file-api/client-side-file-upload) documentation.


# Minimal setup
The plugin is published on npm. First, you need install it using npm or yarn.

### Using yarn
```
yarn add imagekit-uppy-plugin
```

### Using npm
```
npm install imagekit-uppy-plugin --save
```

Then include it in your application with mandatory parameters i.e. `id`, `authenticationEndpoint` and `publicKey`.

``` javascript
import Uppy from '@uppy/core'
import '@uppy/core/dist/style.css'
import '@uppy/dashboard/dist/style.css'
import Dashboard from '@uppy/dashboard'
import ImageKitUppyPlugin from "imagekit-uppy-plugin"

const uppy = Uppy({ debug: true, autoProceed: false })
    .use(Dashboard, {
        inline: true,
        trigger: '#uppyDashboard', // your element
    })
    .use(ImageKitUppyPlugin, {
        id: 'ImageKit',
        authenticationEndpoint: `http://www.yourserver.com/auth`,
        publicKey: "your_public_key"
    })
```

By default, this plugin will send all properties of file meta object as string values with the upload requests. You can control which properties to send as part of the upload request using metaFields field while initializing the ImageKit Uppy plugin. Ideally, you should only allow the supported [upload request parameters](https://docs.imagekit.io/api-reference/upload-file-api/client-side-file-upload#request-structure-multipart-form-data) to avoid any surprises.

```javascript
const uppy = Uppy({ debug: true, autoProceed: false })
    .use(Dashboard, {
        inline: true,
        trigger: '#uppyDashboard', // your element
    })
    .use(ImageKitUppyPlugin, {
        id: 'ImageKit',
        authenticationEndpoint: `http://www.yourserver.com/auth`,
        publicKey: "your_public_key"
        metaFields: [
            "useUniqueFileName",
            "tags",
            "folder",
            "isPrivateFile",
            "customCoordinates",
            "responseFields"
        ]
    })
```

# Support
If something doesn't work as expected, please reach out to us at support@imagekit.io or create an issue in this repo. Please try to include a reproducible code sample.