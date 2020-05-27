## 说明

### 浏览器版本

#### 支持的浏览器版本

|浏览器类型          |支持版本      |
|--------------------|--------------|
| chrome             | 58+          |
| opera              | 45+          |
|firefox             |25+           |


> 以上版本为测试的最低版本，自测可以正常转码！

#### 其他浏览器

|浏览器类型    |版本      |浏览器内核  | 是否支持|
|--------------|----------|------------|---------|
|360安全浏览器 | 63       | chrome     |支持     |
|搜狗浏览器    | 58       | chrome     |支持     |
|QQ浏览器      | 70       | chrome     |支持     |

> 以上为测试的版本，对应的其他版本，没有验证


#### 不支持的浏览器

- IE not support

- Edge not support (老的edge)

- Safari not support




### 格式与限制

- 音频文件转换为ogg格式文件，采样率 16K， 单声道

> 文件最短时长不低于3秒

> 文件大小不超过9M

### 涉及文件

- EncoderOgg.js
- recorder.js
- encoderWorker.js
- encoderWorker.wasm


### 参数说明 

- file：上传文件

- duration： 文件录制时长，单位（秒）

- progressCallback 回调参数
    - state："done" 表示转换结束， "recording" 表示还在处理中
    - percent： 转换进度

- doneCallBack  文件转换完成的回调

- errorCallBack： 错误回调

- numberOfChannels：声道，默认1

- encoderSampleRate：采样率： 默认16K

- encoderWorkerPath： encoderWorker.js 路径
  
- OggOpusEncoderWasmPath：wasm 路径

- monitorGain：可选，默认0

- recordingGain：可选，默认1， 
   
   
### 调用示例：

```javascript
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
``` 

### 参考

- [opus-recorder](https://github.com/chris-rudmin/opus-recorder)

- [如何实现前端录音功能](https://zhuanlan.zhihu.com/p/43710364)

- [音乐人必备知识 | 常见的音频格式有哪些？](https://www.bilibili.com/read/cv6126844/)
