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
async function encoderOgg (data) {
    let browser = Recorder.detectBrowser()
    if(browser.browser !== 'chrome' && browser.browser !== 'firefox' && !browser.chromeVersion){
        data.errorCallBack({ message: 'Current browser does not support audio conversion, please use Chrome or Firefox try again!' })
        return
    }

    let recorder
    let MIN_LIMIT = 3 // 文件时长不低于3秒
    let MXA_LIMIT = 1048576 * 9 // 文件大小要求不超过9M
    let file = data.file
    if (file.size > MXA_LIMIT) {
        data.errorCallBack({ message: 'File duration is too big!' })
        return
    }
    let durationInterval
    let url = URL.createObjectURL(file)
    let audioElement = new Audio(url)
    audioElement.addEventListener('loadedmetadata', async function () {
        let duration = audioElement.duration
        if (duration < MIN_LIMIT) {
            data.errorCallBack({ message: 'File duration is too short' })
            return
        }

        fileReader.readAsArrayBuffer(file)
        recorder = createRecorder(data)
        recorder.fileName = file.name.replace(/\.[^\.]+$/, '')
    })

    let fileReader = new FileReader()
    fileReader.onload = async function (e) {
        let fileBuffer = e.target.result

        /* 通过AudioContext.createMediaStreamDestination 生成文件流 */
        let audioCtx = new AudioContext()
        let buffer = await audioCtx.decodeAudioData(fileBuffer)
        let soundSource = audioCtx.createBufferSource()
        soundSource.buffer = buffer

        let destination = audioCtx.createMediaStreamDestination()
        let recordingDuration = Math.min(audioElement.duration, data.duration || 30) // 文件录制时长
        soundSource.connect(destination)
        soundSource.start()

        soundSource.onended = function () {
            // 文件时长不足设定时长时，监听结束事件
            if (recorder.state === 'recording' || recorder.state !== 'inactive') {
                recorder.stop()
                soundSource && soundSource.stop()
                soundSource = null
                if (durationInterval) {
                    clearInterval(durationInterval)
                    data.progressCallback({ state: 'done', percent: 1 })
                }
            }
        }

        let sourceNode = audioCtx.createMediaStreamSource(destination.stream)
        // 录制时间到达设置时长时，停止录制
        durationInterval = setInterval(function () {
            let currentTime = sourceNode.context.currentTime
            if (currentTime > recordingDuration) {
                data.progressCallback({ state: 'done', percent: 1 })
                recorder.stop()
                soundSource && soundSource.stop()
                soundSource = null
                clearInterval(durationInterval)
            } else {
                data.progressCallback({ state: 'recording', percent: currentTime / recordingDuration })
            }
        }, 500)

        recorder.start(sourceNode)
    }
}
