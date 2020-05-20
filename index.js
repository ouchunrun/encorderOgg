
/**
 * 文件上传
 * @type {HTMLElement}
 */
let fileInput = document.getElementById('fileInput')
let audioCtx = new AudioContext();
fileInput.onchange = function () {

    /*** {
        file, // 音频文件
        encoderWorkerPath, //encoderWorker.js 路径
        OggOpusEncoderWasmPath， // OggOpusEncoder.wasm 路径
        duration,  // 录制多少时间
        progressCallback: function(percent) {},  // percent 百分比（时间模拟） 或者直接播放秒数
        doneCallBack: function(file){},  // file 转换后的ogg file对象
        errorCallBack: function(error){}
    }*/
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
        encoderWorkerPath: 'encoderWorker.js',
        OggOpusEncoderWasmPath: 'encoderWorker.wasm',
    })
};

let progressCallback = function(data){
    if(data.state === 'recording'){

    }else if(data.state === 'done'){
        console.warn("转换完成！")
    }
}

let doneCallBack = function(typedArray){
    var dataBlob = new Blob([typedArray], {type: 'audio/ogg'});
    var fileName = new Date().toISOString() + ".opus";
    var url = URL.createObjectURL(dataBlob);

    var audio = document.createElement('audio');
    audio.controls = true;
    audio.src = url;

    var link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.innerHTML = link.download;

    var li = document.createElement('li');
    li.appendChild(link);
    li.appendChild(audio);
    let recordingslist = document.getElementById('recordingslist')
    recordingslist.appendChild(li);
}

let errorCallBack = function(error) {
    console.error(error)
}
