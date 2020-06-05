let fileList = document.getElementById('List')
let safariFileInput = document.getElementById('safariFileInput')
let fileName
let recorder
let arrayBuffer

/**
 * 文件上传
 */
safariFileInput.onchange = function () {
    let file = this.files[0]
    fileName = file.name
    console.log("file: ", file)

    let fileReader = new FileReader()
    fileReader.onload = function () {
        arrayBuffer =  this.result
        console.log('this.result ArrayBuffer is: ', arrayBuffer)

        let blob = new Blob([new Int8Array(arrayBuffer)]);
        let blobURL = URL.createObjectURL(blob)
        console.log("blobURL: ", blobURL)
        // createDownloadLink(blob, fileName)

        // createBuffer 创建AudioBuffer
        encode(arrayBuffer)

        // 处理数据
        AudioBufferProcess(arrayBuffer)
    }

    fileReader.readAsArrayBuffer(file)
    safariFileInput.value = "";  // clear input
}

/**
 * This function converts an ArrayBuffer to Float32Array
 * @param buffer
 * @returns {Float32Array}
 */
function convertBlock(buffer) { // incoming data is an ArrayBuffer
    var incomingData = new Uint8Array(buffer); // create a uint8 view on the ArrayBuffer
    var i, l = incomingData.length; // length, we need this for the loop
    var outputData = new Float32Array(incomingData.length); // create the Float32Array for output
    for (i = 0; i < l; i++) {
        outputData[i] = (incomingData[i] - 128) / 128.0; // convert audio to float
    }
    return outputData; // return the Float32Array
}

/**
 * createBuffer创建AudioBuffer
 * 会持续10秒：sampleRate*5 / sampleRate = 5 秒。
 * @param buffers
 */
function encode( buffers ) {
    /**
     * Error: byte length of Float32Array should be a multiple of 4 at new Float32Array
     * 原因：ArrayBuffer的大小应该是4的倍数
     * @type {Float32Array}
     */
    buffers = convertBlock(buffers)
    let float32Array = new Float32Array(buffers);
    console.warn("float32Array: ", float32Array)
    window.test = float32Array

    let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    console.warn(audioCtx)
    let channels = 2
    let frameCount = audioCtx.sampleRate * 5
    let myArrayBuffer = audioCtx.createBuffer(channels, frameCount, audioCtx.sampleRate)

    for (let channel = 0; channel < channels; channel++) {
        let nowBuffering = myArrayBuffer.getChannelData(channel)
        console.warn("nowBuffering: ", nowBuffering)
        for (let  i = 0; i < frameCount; i++) {
            nowBuffering[i] = Math.random() * 2 - 1;
            // nowBuffering[i] = float32Array[i]
        }
    }

    let source = audioCtx.createBufferSource();
    // set the buffer in the AudioBufferSourceNode
    source.buffer = myArrayBuffer;
    source.onended = function(){
        console.warn("createBufferSource onended!")
        recorder.stop()
    }
    let destination = audioCtx.createMediaStreamDestination()
    source.connect(destination)
    source.start();

    let mediaStreamSource = audioCtx.createMediaStreamSource(destination.stream)
    console.warn("mediaStreamSource: ", mediaStreamSource)
    encoderOgg2(mediaStreamSource)
}

/**
 * 尝试把 ArrayBuffer 数据处理为 AudioBuffer，兼容safari
 * createBufferSource 处理需要 AudioBuffer 类型
 * createBuffer() 方法用于新建一个空白的 AudioBuffer
 * createBuffer 接口出来的数据如何填充？？？？
 * recorder 接口需要一个 MediaStreamAudioSourceNode 参数
 */
function AudioBufferProcess(arrayBuffer) {
    console.log("AudioBufferProcess arrayBuffer: ", arrayBuffer)
    let typedArray = new Int16Array(arrayBuffer)
    let tmpBufferList = []
    let bufferLength = 4096
    for (let i = 0; i < typedArray.length; i += bufferLength) {
        let  tmpBuffer = new Float32Array(bufferLength)
        for (let j = 0 ; j < bufferLength; j++) {
            tmpBuffer[j] = typedArray[i + j] / 32768
        }
        tmpBufferList.push(tmpBuffer)
    }
}

/**
 * 开始录制
 * @param mediaStreamSource
 */
function encoderOgg2(mediaStreamSource) {
    let data = {
        duration: 30,
        progressCallback: function (data) {
            console.warn("progressCallback: ", data)
        },
        doneCallBack: function (file, blob) {
            console.warn("转换完成！！")
            let dataBlob = new Blob([blob], {type: 'audio/ogg'});
            createDownloadLink(dataBlob,file.name)
        },
        errorCallBack: function (data) {
            console.error('errorCallBack ', data)
        },
        monitorGain: parseInt(monitorGain.value, 10),
        recordingGain: parseInt(recordingGain.value, 10),
        numberOfChannels: parseInt('1', 10),
        encoderSampleRate: parseInt('16000', 10),
        encoderWorkerPath: '/to-ogg-worker/encoderWorker.js',
    }
    recorder = createRecorder(data)
    recorder.fileName = fileName
    recorder.start(mediaStreamSource)
}

/**
 * 创建下载链接
 * @param blob
 * @param fileName
 */
function createDownloadLink(blob,fileName) {
    let  url = URL.createObjectURL(blob);
    let  au = document.createElement('audio');
    let  li = document.createElement('li');
    let  link = document.createElement('a');

    //add controls to the <audio> element
    au.controls = true;
    au.src = url;

    //link the a element to the blob
    link.href = url;
    link.download = new Date().toISOString() + fileName;
    link.innerHTML = link.download;

    //add the new audio and a elements to the li element
    li.appendChild(au);
    li.appendChild(link);

    //add the li element to the ordered list
    fileList.appendChild(li);
}

