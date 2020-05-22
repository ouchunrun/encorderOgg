## 功能

- 音频文件转换为ogg格式文件，采样率 16K， 单声道

> 文件最短时长不低于3秒

> 文件大小不超过9M

## 使用文件：

- main.js
- recorder.js
- encoderWorker.js
- encoderWorker.wasm


## encoderOgg 参数说明 

- file：上传文件


- duration： 文件录制时长，单位（秒）

- progressCallback 回调参数
    - state："done" 表示转换结束， "recording" 表示还在处理中
    - currentTime： 当前转换时间。调用示例：
```
progressCallback({state: 'done'})

progressCallback({state: 'recording', currentTime: currentTime})
```

- doneCallBack  文件转换完成的回调

- errorCallBack： 错误回调

- numberOfChannels：声道，默认1

- encoderSampleRate：采样率： 默认16K

- encoderWorkerPath： encoderWorker.js 路径
  
- OggOpusEncoderWasmPath：wasm 路径
    - 文件使用位置：encoderWorker.js[1648 行]：wasmBinaryFile
    - 与 encoderWorker.js 路径保持一致

- monitorGain：可选，默认0

- recordingGain：可选，默认1， 
    
## 其他

- 获取channelCount
```
 let tracks = this.stream.getAudioTracks();
 let channelCount = tracks[0].getSettings().channelCount || 1;
```

## 参考

- [opus-recorder](https://github.com/chris-rudmin/opus-recorder)

- [如何实现前端录音功能](https://zhuanlan.zhihu.com/p/43710364)
