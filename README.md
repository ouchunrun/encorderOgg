## encoderOgg 参数说明 

- file：上传文件


- duration： 文件录制时长，单位（秒）
    - 文件最短时长不低于3秒
    - 文件大小要求不超过9M

- progressCallback 回调参数
    - state："done" 表示转换结束， "recording" 表示还在处理中。调用示例：
    - currentTime： 当前转换时间
```
progressCallback({state: 'done'})

progressCallback({state: 'recording', currentTime: currentTime})
```

- doneCallBack  文件转换完成的回调

- errorCallBack： 错误回调

- monitorGain：可选，默认0 【功能还没细究】

- recordingGain：可选，默认1，【功能还没细究】

- numberOfChannels：声道，默认1

- encoderSampleRate：采样率： 默认16K

- encoderWorkerPath： encoderWorker.js 路径
  
- OggOpusEncoderWasmPath：wasm 路径
    - 文件使用位置：encoderWorker.js[1648 行]：wasmBinaryFile
    