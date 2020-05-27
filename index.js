let audio = document.getElementById('localAudio');
let link = document.getElementById('linkA')
/**
 * 文件上传
 * @type {HTMLElement}
 */
let fileInput = document.getElementById('fileInput')
fileInput.onchange = function () {
    encoderOgg({
        file: this.files[0],
        duration: 30,
        progressCallback: progressCallback,
        doneCallBack:doneCallBack,
        errorCallBack: errorCallBack,
        monitorGain: parseInt(monitorGain.value, 10),
        recordingGain: parseInt(recordingGain.value, 10),
        numberOfChannels: parseInt(numberOfChannels.value, 10),
        encoderSampleRate: parseInt(encoderSampleRate.value, 10),
        encoderWorkerPath: '/to-ogg-worker/encoderWorker.js',
    })
    fileInput.value = "";  // clear input
};

/**
 * 进度处理
 * @param data
 */
function progressCallback(data){
    let progressShow = document.getElementById('progress')
    if(data.state === 'recording'){
        progressShow.innerHTML = Math.round(data.percent * 100);
    }else if(data.state === 'done'){
        progressShow.innerHTML = '100';
    }
}

/**
 * 转换完成后的处理
 * @param file
 * @param blob
 */
function doneCallBack(file, blob){
    let dataBlob = new Blob([blob], {type: 'audio/ogg'});
    let url = URL.createObjectURL(dataBlob);
    audio.src = url;
    link.href = url;
    link.download = file.name;
    link.innerHTML = link.download;
}

/**
 * 错误处理
 * @param error
 */
function errorCallBack(error) {
    alert(error.message)
}
