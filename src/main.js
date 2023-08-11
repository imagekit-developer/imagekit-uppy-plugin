import { Plugin } from '@uppy/core'
import settle from '@uppy/utils/lib/settle'
import { Provider, RequestClient, Socket } from '@uppy/companion-client'
import emitSocketProgress from '@uppy/utils/lib/emitSocketProgress'
import getSocketHost from '@uppy/utils/lib/getSocketHost'
import ProgressTimeout from '@uppy/utils/lib/ProgressTimeout'
import EventTracker from '@uppy/utils/lib/EventTracker'
import NetworkError from '@uppy/utils/lib/NetworkError'
import RateLimitedQueue from '@uppy/utils/lib/RateLimitedQueue'
import isNetworkError from '@uppy/utils/lib/isNetworkError'

function buildResponseError(error, xhr) {
    // No error message
    if (!error) error = new Error('Upload error')
    // Got an error message string
    if (typeof error === 'string') error = new Error(error)
    // Got something else
    if (!(error instanceof Error)) {
        error = Object.assign(new Error('Upload error'), { data: error })
    }

    if (xhr) {
        if (isNetworkError(xhr)) {
            error = new NetworkError(error, xhr)
            return error
        }
        error.request = xhr
    }

    return error
}

class ImageKitUppyPlugin extends Plugin {
    constructor(uppy, opts) {
        super(uppy, opts)
        this.id = opts.id || 'ImageKit'
        this.type = 'uploader'
        this.title = 'ImageKit.io'
        this.handleUpload = this.handleUpload.bind(this);
        this.uploadEndpoint = opts.uploadEndpoint || "https://upload.imagekit.io/api/v1/files/upload";

        if (!opts.publicKey) {
            throw new Error('publicKey is missing')
        }

        if (!opts.authenticator) {
            throw new Error('The authenticator function is not provided.');
        }

        if (typeof opts.authenticator !== 'function') {
            throw new Error('The provided authenticator is not a function.');
        }

        if (opts.authenticator.length !== 0) {
            throw new Error('The authenticator function should not accept any parameters. Please provide a parameterless function reference.');
        }

        // Simultaneous upload limiting is shared across all uploads with this plugin.
        // __queue is for internal Uppy use only!
        if (this.opts.__queue instanceof RateLimitedQueue) {
            this.requests = this.opts.__queue
        } else {
            this.requests = new RateLimitedQueue(this.opts.limit)
        }

        const defaultOptions = {
            timeout: 30 * 1000
        };

        this.opts = { ...defaultOptions, ...opts }

        this.uploaderEvents = Object.create(null)
    }

    onFileRemove(fileID, cb) {
        this.uploaderEvents[fileID].on('file-removed', (file) => {
            if (fileID === file.id) cb(file.id)
        })
    }

    onRetry(fileID, cb) {
        this.uploaderEvents[fileID].on('upload-retry', (targetFileID) => {
            if (fileID === targetFileID) {
                cb()
            }
        })
    }

    onRetryAll(fileID, cb) {
        this.uploaderEvents[fileID].on('retry-all', (filesToRetry) => {
            if (!this.uppy.getFile(fileID)) return
            cb()
        })
    }

    onCancelAll(fileID, cb) {
        this.uploaderEvents[fileID].on('cancel-all', () => {
            if (!this.uppy.getFile(fileID)) return
            cb()
        })
    }

    handleUpload(fileIDs) {
        if (fileIDs.length === 0) {
            this.uppy.log('[ImageKit] No files to upload!')
            return Promise.resolve()
        }

        this.uppy.log('[ImageKit] Uploading...')
        const files = fileIDs.map((fileID) => this.uppy.getFile(fileID))

        return this.uploadFiles(files).then(() => null)
    }

    uploadFiles(files) {
        const promises = files.map((file, i) => {
            const current = parseInt(i, 10) + 1
            const total = files.length

            if (file.error) {
                return Promise.reject(new Error(file.error))
            } else {
                return new Promise((resolve, reject) => {
                    const queuedRequest = this.requests.run(() => {
                        this.upload(file, current, total)
                            .then((res) => {
                                queuedRequest.done()
                                resolve(res)
                            }).catch((err) => {
                                queuedRequest.done()
                                reject(err)
                            })
                    })
                })
            }
        })

        return settle(promises)
    }

    _uploadDirectly(formData, file, timeout) {
        return new Promise((resolve, reject) => {
            var uploadFileXHR = new XMLHttpRequest();
            this.uppy.emit('upload-started', file);
            this.uploaderEvents[file.id] = new EventTracker(this.uppy)

            const timer = new ProgressTimeout(timeout, () => {
                uploadFileXHR.abort();
                // queuedRequest.done()
                const error = new Error('timedOut', { seconds: Math.ceil(timeout / 1000) });
                reject([error, uploadFileXHR]);
            })

            const id = file.id || "";

            uploadFileXHR.upload.addEventListener('loadstart', (ev) => {
                this.uppy.log(`[ImageKit] ${id} started`)
            })

            uploadFileXHR.upload.addEventListener('progress', (ev) => {
                this.uppy.log(`[ImageKit] ${id} progress: ${ev.loaded} / ${ev.total}`)
                // Begin checking for timeouts when progress starts, instead of loading,
                // to avoid timing out requests on browser concurrency queue
                timer.progress()

                if (ev.lengthComputable) {
                    this.uppy.emit('upload-progress', file, {
                        uploader: this,
                        bytesUploaded: ev.loaded,
                        bytesTotal: ev.total
                    })
                }
            })

            uploadFileXHR.addEventListener('error', (ev) => {
                this.uppy.log(`[ImageKit] ${id} errored`)
                timer.done()
                // queuedRequest.done()
                if (this.uploaderEvents[file.id]) {
                    this.uploaderEvents[file.id].remove()
                    this.uploaderEvents[file.id] = null
                }
                return reject([new Error("Upload error"), uploadFileXHR]);
            })

            uploadFileXHR.open('POST', this.uploadEndpoint);
            uploadFileXHR.addEventListener("load", () => {
                this.uppy.log(`[ImageKit] ${id} finished`)
                timer.done()
                // queuedRequest.done()
                if (this.uploaderEvents[file.id]) {
                    this.uploaderEvents[file.id].remove()
                    this.uploaderEvents[file.id] = null
                }

                if (uploadFileXHR.status === 200) {
                    try {
                        var uploadResponse = JSON.parse(uploadFileXHR.responseText);
                        resolve(uploadResponse);
                    } catch (ex) {
                        reject([ex, uploadFileXHR]);
                    }

                }
                else if (uploadFileXHR.status !== 200) {
                    try {
                        var error = JSON.parse(uploadFileXHR.responseText);
                        if (error.message) reject([error.message, uploadFileXHR]);
                        else reject([error, uploadFileXHR]);
                    } catch (ex) {
                        reject([ex, uploadFileXHR]);
                    }
                }
            });

            uploadFileXHR.send(formData);
        });
    }

    _uploadRemote(formData, file, timeout) {
        var metadata = {};
        for (var pair of formData.entries()) {
            // exclude file
            if (pair[0] != "file") {
                metadata[pair[0]] = pair[1];
            }
        }
        delete formData.file;
        return new Promise((resolve, reject) => {
            this.uppy.emit('upload-started', file)

            const Client = file.remote.providerOptions.provider ? Provider : RequestClient
            const client = new Client(this.uppy, file.remote.providerOptions)
            client.post(file.remote.url, {
                ...file.remote.body,
                endpoint: this.uploadEndpoint,
                size: file.data.size,
                httpMethod: "POST",
                metadata: metadata,
                useFormData: formData,
                fieldname: "file"
            }).then((res) => {
                const token = res.token
                const host = getSocketHost(file.remote.companionUrl)
                const socket = new Socket({ target: `${host}/api/${token}`, autoOpen: false })
                this.uploaderEvents[file.id] = new EventTracker(this.uppy)

                this.onFileRemove(file.id, () => {
                    socket.send('pause', {})
                    queuedRequest.abort()
                    resolve(`upload ${file.id} was removed`)
                })

                this.onCancelAll(file.id, () => {
                    socket.send('pause', {})
                    queuedRequest.abort()
                    resolve(`upload ${file.id} was canceled`)
                })

                this.onRetry(file.id, () => {
                    socket.send('pause', {})
                    socket.send('resume', {})
                })

                this.onRetryAll(file.id, () => {
                    socket.send('pause', {})
                    socket.send('resume', {})
                })

                socket.on('progress', (progressData) => emitSocketProgress(this, progressData, file))

                socket.on('success', (data) => {
                    var uploadResponse = JSON.parse(data.response.responseText);

                    queuedRequest.done()
                    if (this.uploaderEvents[file.id]) {
                        this.uploaderEvents[file.id].remove()
                        this.uploaderEvents[file.id] = null
                    }
                    return resolve(uploadResponse);
                })

                socket.on('error', (errData) => {
                    queuedRequest.done()
                    if (this.uploaderEvents[file.id]) {
                        this.uploaderEvents[file.id].remove()
                        this.uploaderEvents[file.id] = null
                    }

                    try {
                        var error = JSON.parse(errData.responseText);
                        if (error.message) {
                            return reject([error.message]);
                        }
                        else {
                            return reject([error]);
                        }
                    } catch (ex) {
                        return reject([ex, errData]);
                    }
                })

                const queuedRequest = this.requests.run(() => {
                    socket.open()
                    if (file.isPaused) {
                        socket.send('pause', {})
                    }

                    return () => socket.close()
                })
            }).catch((err) => {
                reject([err]);
            })
        })
    }

    upload(file, current, total) {
        return new Promise((resolve, reject) => {
            this.uppy.log(`uploading ${current} of ${total}`);
            var formData = new FormData();
            const metaFields = Object.keys(file.meta);
            metaFields.map(key => {
                if (key === "name") {
                    formData.append("fileName", file.meta.name.toString());
                    return;
                }
                if (this.opts.metaFields && this.opts.metaFields.length && this.opts.metaFields.indexOf(key) == -1) {
                    return;
                }
                var value = file.meta[key];
                if (value !== null && typeof value !== "undefined") { // We need to pass false values as string
                    if (["tags", "responseFields"].indexOf(key) !== -1 && Array.isArray(value)) {
                        value = value.join(",")
                    }
                    formData.append(key, value.toString()); // Always pass value as string
                }
            });
            if (!formData.get("fileName") || !formData.get("fileName").trim()) {
                formData.set("fileName", file.name);
            }
            formData.append("publicKey", this.opts.publicKey);
            formData.append("file", file.data);

            const authPromise = this.opts.authenticator()

            if (!(authPromise instanceof Promise)) {
                return this.uppy.emit('upload-error', file, buildResponseError('The authenticator function is expected to return a Promise instance.'));
            }

            authPromise
                .then(({ signature, token, expire }) => {
                    formData.append("signature", signature);
                    formData.append("expire", expire);
                    formData.append("token", token);
                    if (file.remote) {
                        return this._uploadRemote(formData, file, this.opts.timeout)
                    } else {
                        return this._uploadDirectly(formData, file, this.opts.timeout)
                    }

                })
                .then(uploadResponse => {
                    this.uppy.emit('upload-success', file, {
                        status: 200,
                        body: uploadResponse,
                        uploadURL: uploadResponse.url
                    })
                    return resolve(file);
                })
                .catch((data) => {
                    var error, xhr;
                    if (data instanceof Array) {
                        error = data[0];
                        xhr = data[1];
                    }
                    else {
                        error = data
                    }

                    this.uppy.emit('upload-error', file, buildResponseError(error, xhr));
                    reject(file);
                })
        });
    }

    install() {
        this.uppy.addUploader(this.handleUpload)
    }

    uninstall() {
        this.uppy.removeUploader(this.handleUpload)
    }
}

export default ImageKitUppyPlugin
