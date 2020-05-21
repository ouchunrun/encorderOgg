
/**
 * 创建 mediaRecorder
 */
function createRecorder(data) {
    let mediaRecorder
    let options = {
        monitorGain: data.monitorGain || 0,
        recordingGain: data.recordingGain || 1,
        numberOfChannels: data.numberOfChannels || 1,
        encoderSampleRate: data.encoderSampleRate || 16000,
        // Todo: necessary due to Google bug? (https://github.com/chris-rudmin/opus-recorder/issues/191#issuecomment-509426093)
        originalSampleRateOverride: data.encoderSampleRate || 16000,
        recordingDuration: data.recordingDuration || 30000,
        encoderPath: data.encoderWorkerPath || 'encoderWorker.js',
        encoderPathWasmPath: data.OggOpusEncoderWasmPath || 'encoderWorker.wasm',
    };
    mediaRecorder = new Recorder(options);
    mediaRecorder.recoderOptions = data

    mediaRecorder.onstart = function (e) {
        console.log('mediaRecorder is started');
    };

    mediaRecorder.onstop = function (e) {
        console.log('mediaRecorder is stopped');
    };

    mediaRecorder.onpause = function (e) {
        console.log('mediaRecorder is paused');
    };

    mediaRecorder.onresume = function (e) {
        console.log('mediaRecorder is resuming');
    };

    mediaRecorder.ondataavailable = function (typedArray) {
        console.log('Data ondataavailable received');
        mediaRecorder.recoderOptions.doneCallBack(typedArray)
    };

    return mediaRecorder
}

/**
 * 音频文件转换为ogg
 * @param data
 * @returns {Promise<void>}
 */
async function encoderOgg(data) {
    let recorder;
    let durationInterval;
    let MIN_LIMIT = 3;
    let MXA_LIMIT = 1048576 * 9;  // 文件大小要求不超过9M
    let file = data.file;
    if(file.size > MXA_LIMIT){
        data.errorCallBack({message: 'File duration is too big!'})
        return
    }

    let url = URL.createObjectURL(file);
    let audioElement = new Audio(url);
    audioElement.addEventListener("loadedmetadata", async function () {
        // 文件​最短时长为3秒，小于3秒，不做转换
        let duration = audioElement.duration;
        if(duration < MIN_LIMIT){
            data.errorCallBack({message: 'File duration is too short'})
            return
        }

        fileReader.readAsArrayBuffer(file);
        recorder = createRecorder(data)
    });

    let fileReader = new FileReader();
    let recordingDuration = data.duration || 30;  // 文件录制时长
    let audioCtx = new AudioContext();

    fileReader.onload = async function (e) {
        let fileBuffer = e.target.result

        /*通过AudioContext.createMediaStreamDestination 生成文件流*/
        let buffer = await audioCtx.decodeAudioData(fileBuffer)
        let soundSource = audioCtx.createBufferSource();
        soundSource.buffer = buffer;

        let destination = audioCtx.createMediaStreamDestination();
        soundSource.connect(destination);
        soundSource.start();

        soundSource.onended = function(){
            // 文件时长不足设定时长时，监听结束事件
            if(recorder.state === 'recording' || recorder.state !== 'inactive'){
                recorder.stop()
                if(durationInterval){
                    clearInterval(durationInterval)
                    data.progressCallback({state: 'done'})
                }
            }
        }

        let sourceNode = audioCtx.createMediaStreamSource(destination.stream);
        // 录制时间到达设置时长时，停止录制
        durationInterval = setInterval(function () {
            let currentTime = sourceNode.context.currentTime
            if(currentTime > recordingDuration){
                data.progressCallback({state: 'done'})
                recorder.stop()
                clearInterval(durationInterval)
            }else {
                data.progressCallback({state: 'recording', currentTime: currentTime})
            }
        }, 500)

        recorder.start(sourceNode)
    };
}

