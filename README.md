# ImageKit.io plugin for Uppy upload widget
[![npm version](https://img.shields.io/npm/v/imagekit-uppy-plugin)](https://www.npmjs.com/package/imagekit-uppy-plugin)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Twitter Follow](https://img.shields.io/twitter/follow/imagekitio?label=Follow&style=social)](https://twitter.com/ImagekitIo)

ImageKit plugin for [Uppy](https://github.com/transloadit/uppy) allows you to upload files directly to the ImageKit.io media library.

<img src="/assets/imagekit-uppy-demo.gif">

## Changelog - SDK Version 2.0.0
### Breaking changes
**1. Authentication Process Update:**
* In version 2.0.0, we have deprecated using the `authenticationEndpoint` parameter. Instead, the SDK now introduces a new parameter named `authenticator`. This parameter expects an asynchronous function that resolves with an object containing the necessary security parameters i.e `signature`, `token`, and `expire`. For implementation guidance, please [see](#using-npm).

# Getting started
You can see a hosted demo of using this plugin in a real project [here](https://066dn.sse.codesandbox.io) or [fork sample project codesandbox.io](https://codesandbox.io/s/github/imagekit-samples/uppy-uploader).

* [Sample project](https://github.com/imagekit-samples/uppy-uploader) using this plugin with Dropbox, Drive, and Facebook upload options.
* A step-by-step walkthrough of the sample project is available at https://docs.imagekit.io/sample-projects/upload-widget/uppy-upload-widget/.
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

Then include it in your application with mandatory parameters, i.e., `id`, `authenticator`, and `publicKey`.

``` javascript
import Uppy from '@uppy/core'
import '@uppy/core/dist/style.css'
import '@uppy/dashboard/dist/style.css'
import Dashboard from '@uppy/dashboard'
import ImageKitUppyPlugin from "imagekit-uppy-plugin"

const authenticator = async () => {
    try {
        // Code to fetch security parameters for authentication asynchronously
        // Complete implementation is shown below
        const securityParameters = await fetchSecurityParameters();
        return securityParameters; // Return the fetched parameters { signature, token, expire }
    } catch (error) {
        throw new Error("Authentication request failed: " + error.message); // Throw an error if authentication fails
    }
};

const uppy = Uppy({ debug: true, autoProceed: false })
    .use(Dashboard, {
        inline: true,
        trigger: '#uppyDashboard', // your element
    })
    .use(ImageKitUppyPlugin, {
        id: 'ImageKit',
        authenticator,
        publicKey: "your_public_key"
    })
```

The plugin utilises an asynchronous function named `authenticator`, which is intended to be used for retrieving security parameters from your backend. This function is expected to resolve an object containing three fields:`signature`, `token`, and `expire`.

#### Example implementation for `authenticator` using `Fetch API`
``` javascript
const authenticator = async () => {
    try {

        // You can pass headers as well and later validate the request source in the backend, or you can use headers for any other use case.
        const headers = {
          'Authorization': 'Bearer your-access-token',
          'CustomHeader': 'CustomValue'
        };

        const response = await fetch('server_endpoint', {
            headers
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Request failed with status ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const { signature, expire, token } = data;
        return { signature, expire, token };
    } catch (error) {
        throw new Error(`Authentication request failed: ${error.message}`);
    }
};
```

*Note*: Avoid generating security parameters on the client side. Always send a request to your backend to retrieve security parameters, as the generation of these parameters necessitates the use of your Imagekit `privateKey`, which must not be included in client-side code. 

Learn [how to generate security parameters](https://docs.imagekit.io/api-reference/upload-file-api/client-side-file-upload#how-to-implement-authenticationendpoint-endpoint) on your server using ImageKit.io server-side SDKs.

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
        authenticator,
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

You can use the `limit` parameter to enable batch processing and set the batch size for upload. By default, all upload requests are sent simultaneously. 

In the following example, the selected files would be uploaded in batches, with each batch having a maximum of 10 files.

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
        authenticator,
        publicKey: "your_public_key",
        limit: 10
    })
```

# Support
If something doesn't work as expected, please reach out to us at support@imagekit.io or create an issue in this repo. Please try to include a reproducible code sample.
