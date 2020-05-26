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
    mediaRecorder = new Recorder(options)
    mediaRecorder.recoderOptions = data

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
    let browser = Recorder.detectBrowser()
    if(browser.browser !== 'chrome' && browser.browser !== 'firefox' && !browser.chromeVersion){
        data.errorCallBack({ message: Recorder.ERROR_MESSAGE.ERROR_CODE_1002.description })
        return
    }

    /**
     * 无效参数判断：判断是否传入必要参数
     */
    if(!data || !data.file || !data.doneCallBack){
        console.warn(data)
        data.errorCallBack({ message:  Recorder.ERROR_MESSAGE.ERROR_CODE_1003.description })
        return
    }
    let file = data.file
    console.log('current upload file type ' + file.type)

    /**
     * 判断是否为音频
     */
    if(!/audio\/\w+/.test(file.type)){
        data.errorCallBack({ message: Recorder.ERROR_MESSAGE.ERROR_CODE_1008.description })
        return
    }

    let recorder
    let MIN_LIMIT = 3 // 文件时长不低于3秒
    let MXA_LIMIT = 9 * 1024 * 1024 // 文件大小要求不超过9M
    if (file.size > MXA_LIMIT) {
        data.errorCallBack({ message: Recorder.ERROR_MESSAGE.ERROR_CODE_1004.description})
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
    function bufferSourceOnEnded() {
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
    function recorderStopHandler() {
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
    }

    /**
     * 创建 mediaStreamSource
     * 通过AudioContext.createMediaStreamDestination 生成文件流
     * @param decodedData
     */
    function createSourceNode(decodedData){
        bufferSource = audioCtx.createBufferSource()
        bufferSource.buffer = decodedData
        bufferSource.onended = bufferSourceOnEnded

        let destination = audioCtx.createMediaStreamDestination()
        recordingDuration = Math.min(data.duration || 30) // 文件录制时长
        bufferSource.connect(destination)
        bufferSource.start()

        mediaStreamSource = audioCtx.createMediaStreamSource(destination.stream)
        durationInterval = setInterval(recorderStopHandler, 500)
        recorder.start(mediaStreamSource)
    }

    fileReader.onload = function () {
        let buffer = this.result
        audioCtx.decodeAudioData(buffer).then(function (decodedData) {
            let duration = decodedData.duration
            if (duration < MIN_LIMIT) {
                data.errorCallBack({ message: Recorder.ERROR_MESSAGE.ERROR_CODE_1005.description })
                return
            }

            createSourceNode(decodedData)
        }, function (error) {
            console.warn('*************** Error catch: ', error)
            if(error.message === 'Unable to decode audio data'){
                data.errorCallBack({ message: Recorder.ERROR_MESSAGE.ERROR_CODE_1006.description })
            }else {
                data.errorCallBack({ message: error.message })
            }
        })
    }

    fileReader.readAsArrayBuffer(file)
    recorder = createRecorder(data)
    recorder.fileName = file.name.replace(/\.[^\.]+$/, '')
}

// 全局错误如何处理？？
window.addEventListener("error", function(error) {
    console.error(error)
}, true);
