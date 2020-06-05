// import Recorder from './Recorder'

/**
 * 创建 mediaRecorder
 */
function createRecorder (data) {
    let mediaRecorder
    let options = {
        monitorGain: data.monitorGain || 0,
        recordingGain: data.recordingGain || 1,
        numberOfChannels: data.numberOfChannels || 1,
        encoderSampleRate: data.encoderSampleRate || 16000,
        originalSampleRateOverride: data.encoderSampleRate || 16000,
        recordingDuration: data.recordingDuration || 30000,
        encoderPath: data.encoderWorkerPath || 'encoderWorker.js'
    }
    mediaRecorder = new Recorder(options, data)

    mediaRecorder.onstart = function (e) {
        console.log('mediaRecorder is started')
    }

    mediaRecorder.onstop = function (e) {
        console.log('mediaRecorder is stopped')
    }

    mediaRecorder.onpause = function (e) {
        console.log('mediaRecorder is paused')
    }

    mediaRecorder.onresume = function (e) {
        console.log('mediaRecorder is resuming')
    }

    mediaRecorder.ondataavailable = function (blob) {
        console.log('Data ondataavailable received')
        mediaRecorder.recoderOptions.doneCallBack(new File([blob], `${mediaRecorder.fileName}.ogg`, {
            type: 'audio/ogg;codecs=opus'
        }), blob)
    }

    return mediaRecorder
}

/**
 * 音频文件转换为ogg
 * @param data
 * @returns {Promise<void>}
 */
// export default
function encoderOgg (data) {
    let browserDetails = Recorder.getBrowserDetails()
    console.log('browserDetails : ', browserDetails)
    if (browserDetails.browser === 'ie' || browserDetails.browser === 'edge' || browserDetails.browser === 'safari' || (browserDetails.browser === 'chrome' && browserDetails.version < 58) || (browserDetails.browser === 'opera' && browserDetails.chromeVersion < 58) || (browserDetails.browser === 'firefox' && browserDetails.version < 52)) {
        data.errorCallBack(Recorder.ERROR_MESSAGE.ERROR_CODE_1007)
        return
    }

    if (!Recorder.isRecordingSupported()) {
        console.error('AudioContext or WebAssembly is not supported')
        if (data && data.errorCallBack) {
            if (!window.AudioContext) {
                data.errorCallBack(Recorder.ERROR_MESSAGE.ERROR_CODE_1002)
            } else if (!window.WebAssembly) {
                data.errorCallBack(Recorder.ERROR_MESSAGE.ERROR_CODE_1003)
            }
        }
        return
    }

    /**
     * 无效参数判断：判断是否传入必要参数
     */
    if (!data || !data.file || !data.doneCallBack) {
        console.warn(data)
        data.errorCallBack(Recorder.ERROR_MESSAGE.ERROR_CODE_1001)
        return
    }
    let file = data.file
    console.log('current upload file type ' + file.type)

    /**
     * 判断是否为音频
     */
    if (!/audio\/\w+/.test(file.type)) {
        data.errorCallBack(Recorder.ERROR_MESSAGE.ERROR_CODE_1006)
        return
    }

    let recorder
    let MIN_LIMIT = 3 // 文件时长不低于3秒
    let MXA_LIMIT = 9 * 1024 * 1024 // 文件大小要求不超过9M
    if (file.size > MXA_LIMIT) {
        data.errorCallBack(Recorder.ERROR_MESSAGE.ERROR_CODE_1004)
        return
    }
    let durationInterval
    let bufferSource
    let mediaStreamSource
    let recordingDuration
    let audioCtx = new AudioContext()
    let fileReader = new FileReader()

    /**
     * 监听结束事件:文件时长不足设定时长时
     */
    function bufferSourceOnEnded () {
        if (recorder.state === 'recording' || recorder.state !== 'inactive') {
            recorder.stop()
            bufferSource && bufferSource.stop()
            bufferSource = null
            if (durationInterval) {
                clearInterval(durationInterval)
                data.progressCallback({ state: 'done', percent: 1 })
            }
        }
    }

    /**
     * 录制时间到达设置时长时，停止录制
     */
    function recorderStopHandler () {
        try {
            let currentTime = mediaStreamSource.context.currentTime
            if (currentTime > recordingDuration) {
                data.progressCallback({ state: 'done', percent: 1 })
                recorder.stop()
                bufferSource && bufferSource.stop()
                bufferSource = null
                clearInterval(durationInterval)
            } else {
                data.progressCallback({ state: 'recording', percent: currentTime / recordingDuration })
            }
        } catch (e) {
            data.errorCallBack(Recorder.ERROR_MESSAGE.ERROR_CODE_1009(e))
        }
    }

    /**
     * 创建 mediaStreamSource
     * 通过AudioContext.createMediaStreamDestination 生成文件流
     * @param decodedData
     */
    function createSourceNode (decodedData) {
        try {
            // 创建一个新的AudioBufferSourceNode接口, 该接口可以通过AudioBuffer 对象来播放音频数据
            bufferSource = audioCtx.createBufferSource()
            bufferSource.buffer = decodedData
            bufferSource.onended = bufferSourceOnEnded

            // 创建一个媒体流的节点
            let destination = audioCtx.createMediaStreamDestination()
            recordingDuration = Math.min(data.duration || 30) // 文件录制时长
            bufferSource.connect(destination)
            bufferSource.start()

            // 创建一个新的MediaStreamAudioSourceNode 对象
            mediaStreamSource = audioCtx.createMediaStreamSource(destination.stream)
            durationInterval = setInterval(recorderStopHandler, 500)

            recorder.start(mediaStreamSource)
        } catch (e) {
            data.errorCallBack(Recorder.ERROR_MESSAGE.ERROR_CODE_1009(e))
        }
    }

    try {
        fileReader.onload = function () {
            let buffer = this.result
            audioCtx.decodeAudioData(buffer).then(function (decodedData) {
                let duration = decodedData.duration
                if (duration < MIN_LIMIT) {
                    data.errorCallBack(Recorder.ERROR_MESSAGE.ERROR_CODE_1005)
                    return
                }

                createSourceNode(decodedData)
            }, function (error) {
                console.warn('Error catch: ', error)
                if (error.message === 'Unable to decode audio data') {
                    data.errorCallBack(Recorder.ERROR_MESSAGE.ERROR_CODE_1008)
                } else {
                    data.errorCallBack(Recorder.ERROR_MESSAGE.ERROR_CODE_1009(error))
                }
            })
        }

        fileReader.readAsArrayBuffer(file)
        recorder = createRecorder(data)
        recorder.fileName = file.name.replace(/\.[^\.]+$/, '')
    } catch (e) {
        data.errorCallBack(Recorder.ERROR_MESSAGE.ERROR_CODE_1009(e))
    }
}
