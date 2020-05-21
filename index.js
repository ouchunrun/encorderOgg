
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

let progressCallback = function(data){
    let progressShow = document.getElementById('progress')
    if(data.state === 'recording'){
        progressShow.innerHTML = parseInt(data.percent * 100);
    }else if(data.state === 'done'){
        progressShow.innerHTML = '100';
    }
}

var audio = document.getElementById('audio');
var link = document.getElementById('linkA')
let doneCallBack = function(file, blob){
    var dataBlob = new Blob([blob], {type: 'audio/ogg'});
    var fileName = new Date().toISOString() + ".ogg";
    var url = URL.createObjectURL(dataBlob);
    audio.src = url;
    link.href = url;
    link.download = fileName;
    link.innerHTML = link.download;
}

let errorCallBack = function(error) {
    alert(error.message)
}
