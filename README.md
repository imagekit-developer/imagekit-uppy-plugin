
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
The plugin is published on npm. First, you need to install it using npm or yarn.

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

The plugin makes an HTTP GET request to `authenticationEndpoint` and expects a JSON response with three fields i.e. `signature`, `token` and `expire`. In addition, the plugin adds a query parameter t with a random value to ensure that the request URL is unique and the response is not cached in Safari iOS. Your backend can ignore this query parameter.

Learn [how to implement authenticationEndpoint](https://docs.imagekit.io/api-reference/upload-file-api/client-side-file-upload#how-to-implement-authenticationendpoint-endpoint) on your server using ImageKit.io server-side SDKs.

# Modify file name, destination path or add tags during upload
By default, this plugin will send all properties of file meta object as string values with the upload requests. You can control which properties to send as part of the upload request using metaFields field while initializing the ImageKit Uppy plugin. Ideally, you should only allow the supported [upload request parameters](https://docs.imagekit.io/api-reference/upload-file-api/client-side-file-upload#request-structure-multipart-form-data) to avoid any surprises.

```javascript
const uppy = Uppy({ debug: true, autoProceed: false })
    .use(Dashboard, {
        inline: true,
        trigger: '#uppyDashboard', // your element
        metaFields : [
            {
                id: 'name', name: 'File name', placeholder: 'Enter the file name'
            },
            {
                id: 'folder', name: 'Folder path', placeholder: 'The destination path e.g. /website-assets'
            }
        ]
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
# Enable batch upload

You can use the `limit` parameter to enable batch processing and set the batch size during upload. By default, there is no limit, and all upload requests are sent simultaneously.

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
        publicKey: "your_public_key",
        limit: 10
    })
```

# Support
If something doesn't work as expected, please reach out to us at support@imagekit.io or create an issue in this repo. Please try to include a reproducible code sample.
