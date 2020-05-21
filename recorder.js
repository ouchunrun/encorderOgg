/* eslint-disable default-case */

let AudioContext = window.AudioContext || window.webkitAudioContext
// Constructor
let Recorder = function (config) {
  if (!Recorder.isRecordingSupported()) {
    if (config && config.recoderOptions && config.recoderOptions.errorCallBack) {
      config.recoderOptions.errorCallBack({ message: 'AudioContext or WebAssembly is not supported' })
    }
    return
  }

  if (!config) {
    config = {}
  }

  this.state = 'inactive'
  this.config = Object.assign({
    bufferLength: 4096,
    encoderApplication: 2049,
    encoderFrameSize: 20,
    encoderPath: 'encoderWorker.js',
    encoderSampleRate: 16000,
    maxFramesPerPage: 40,
    mediaTrackConstraints: true,
    monitorGain: 0,
    numberOfChannels: 1,
    recordingGain: 1,
    resampleQuality: 9,
    streamPages: false,
    reuseWorker: false,
    wavBitDepth: 16
  }, config)

  this.encodedSamplePosition = 0
}

// Static Methods
Recorder.isRecordingSupported = function () {
  return AudioContext && window.WebAssembly
}

// Instance Methods
Recorder.prototype.clearStream = function () {
  if (this.stream) {
    if (this.stream.getTracks) {
      this.stream.getTracks().forEach(function (track) {
        track.stop()
      })
    } else {
      this.stream.stop()
    }

    delete this.stream
  }

  if (this.audioContext && this.closeAudioContext) {
    this.audioContext.close()
    delete this.audioContext
  }
}

Recorder.prototype.encodeBuffers = function (inputBuffer) {
  if (this.state === 'recording') {
    let buffers = []
    for (let i = 0; i < inputBuffer.numberOfChannels; i++) {
      buffers[i] = inputBuffer.getChannelData(i)
    }

    this.encoder.postMessage({
      command: 'encode',
      buffers: buffers
    })
  }
}

Recorder.prototype.initAudioContext = function (sourceNode) {
  if (sourceNode && sourceNode.context) {
    this.audioContext = sourceNode.context
    this.closeAudioContext = false
  } else {
    this.audioContext = new AudioContext()
    this.closeAudioContext = true
  }

  return this.audioContext
}

Recorder.prototype.initAudioGraph = function () {
  // First buffer can contain old data. Don't encode it.
  this.encodeBuffers = function () {
    delete this.encodeBuffers
  }

  this.scriptProcessorNode = this.audioContext.createScriptProcessor(this.config.bufferLength, this.config.numberOfChannels, this.config.numberOfChannels)
  this.scriptProcessorNode.connect(this.audioContext.destination)
  this.scriptProcessorNode.onaudioprocess = (e) => {
    this.encodeBuffers(e.inputBuffer)
  }

  this.monitorGainNode = this.audioContext.createGain()
  this.setMonitorGain(this.config.monitorGain)
  this.monitorGainNode.connect(this.audioContext.destination)

  this.recordingGainNode = this.audioContext.createGain()
  this.setRecordingGain(this.config.recordingGain)
  this.recordingGainNode.connect(this.scriptProcessorNode)
}

Recorder.prototype.initSourceNode = function (sourceNode) {
  if (sourceNode && sourceNode.context) {
    return window.Promise.resolve(sourceNode)
  }

  return window.navigator.mediaDevices.getUserMedia({ audio: this.config.mediaTrackConstraints }).then((stream) => {
    this.stream = stream
    return this.audioContext.createMediaStreamSource(stream)
  })
}

Recorder.prototype.loadWorker = function () {
  if (!this.encoder) {
    this.encoder = new window.Worker(this.config.encoderPath)
  }
}

Recorder.prototype.initWorker = function () {
  let onPage = (this.config.streamPages ? this.streamPage : this.storePage).bind(this)

  this.recordedPages = []
  this.totalLength = 0
  this.loadWorker()

  return new Promise((resolve, reject) => {
    let callback = (e) => {
      switch (e['data']['message']) {
        case 'ready':
          resolve()
          break
        case 'page':
          this.encodedSamplePosition = e['data']['samplePosition']
          onPage(e['data']['page'])
          break
        case 'done':
          this.encoder.removeEventListener('message', callback)
          this.finish()
          break
      }
    }

    this.encoder.addEventListener('message', callback)
    this.encoder.postMessage(Object.assign({
      command: 'init',
      originalSampleRate: this.audioContext.sampleRate,
      wavSampleRate: this.audioContext.sampleRate
    }, this.config))
  })
}

Recorder.prototype.pause = function (flush) {
  if (this.state === 'recording') {
    this.state = 'paused'
    if (flush && this.config.streamPages) {
      let encoder = this.encoder
      return new Promise((resolve, reject) => {
        let callback = (e) => {
          if (e['data']['message'] === 'flushed') {
            encoder.removeEventListener('message', callback)
            this.onpause()
            resolve()
          }
        }
        encoder.addEventListener('message', callback)
        encoder.postMessage({ command: 'flush' })
      })
    }
    this.onpause()
    return Promise.resolve()
  }
}

Recorder.prototype.resume = function () {
  if (this.state === 'paused') {
    this.state = 'recording'
    this.onresume()
  }
}

Recorder.prototype.setRecordingGain = function (gain) {
  this.config.recordingGain = gain

  if (this.recordingGainNode && this.audioContext) {
    this.recordingGainNode.gain.setTargetAtTime(gain, this.audioContext.currentTime, 0.01)
  }
}

Recorder.prototype.setMonitorGain = function (gain) {
  this.config.monitorGain = gain

  if (this.monitorGainNode && this.audioContext) {
    this.monitorGainNode.gain.setTargetAtTime(gain, this.audioContext.currentTime, 0.01)
  }
}

Recorder.prototype.start = function (sourceNode) {
  if (this.state === 'inactive') {
    this.initAudioContext(sourceNode)
    this.initAudioGraph()

    this.encodedSamplePosition = 0

    return Promise.all([this.initSourceNode(sourceNode), this.initWorker()]).then((results) => {
      this.sourceNode = results[0]
      this.state = 'recording'
      this.onstart()
      this.encoder.postMessage({ command: 'getHeaderPages' })
      this.sourceNode.connect(this.monitorGainNode)
      this.sourceNode.connect(this.recordingGainNode)
    })
  }
}

Recorder.prototype.stop = function () {
  if (this.state !== 'inactive') {
    this.state = 'inactive'
    this.monitorGainNode.disconnect()
    this.scriptProcessorNode.disconnect()
    this.recordingGainNode.disconnect()
    this.sourceNode.disconnect()
    this.clearStream()

    let encoder = this.encoder
    return new Promise((resolve) => {
      let callback = (e) => {
        if (e['data']['message'] === 'done') {
          encoder.removeEventListener('message', callback)
          resolve()
        }
      }
      encoder.addEventListener('message', callback)
      encoder.postMessage({ command: 'done' })
      if (!this.config.reuseWorker) {
        encoder.postMessage({ command: 'close' })
      }
    })
  }
  return Promise.resolve()
}

Recorder.prototype.destroyWorker = function () {
  if (this.state === 'inactive') {
    if (this.encoder) {
      this.encoder.postMessage({ command: 'close' })
      delete this.encoder
    }
  }
}

Recorder.prototype.storePage = function (page) {
  this.recordedPages.push(page)
  this.totalLength += page.length
}

Recorder.prototype.streamPage = function (page) {
  this.ondataavailable(page)
}

Recorder.prototype.finish = function () {
  if (!this.config.streamPages) {
    let outputData = new Uint8Array(this.totalLength)
    this.recordedPages.reduce(function (offset, page) {
      outputData.set(page, offset)
      return offset + page.length
    }, 0)

    this.ondataavailable(outputData)
  }
  this.onstop()
  if (!this.config.reuseWorker) {
    delete this.encoder
  }
}

// Callback Handlers
Recorder.prototype.ondataavailable = function () {}
Recorder.prototype.onpause = function () {}
Recorder.prototype.onresume = function () {}
Recorder.prototype.onstart = function () {}
Recorder.prototype.onstop = function () {}

Recorder.detectBrowser = function () {
  let navigator = window && window.navigator
  let result = {}
  result.browser = null
  result.version = null
  result.chromeVersion = null
  if (typeof window === 'undefined' || !window.navigator) {
    result.browser = 'Not a browser.'
    return result
  }

  let extractVersion = function (uastring, expr, pos) {
    var match = uastring.match(expr)
    return match && match.length >= pos && parseInt(match[pos], 10)
  }

  if (navigator.mediaDevices && navigator.userAgent.match(/Edge\/(\d+).(\d+)$/)) {
    result.browser = 'edge'
    result.version = extractVersion(navigator.userAgent, /Edge\/(\d+).(\d+)$/, 2)
  } else if (!navigator.mediaDevices && (!!window.ActiveXObject || 'ActiveXObject' in window || navigator.userAgent.match(/MSIE (\d+)/) || navigator.userAgent.match(/rv:(\d+)/))) {
    result.browser = 'ie'
    if (navigator.userAgent.match(/MSIE (\d+)/)) {
      result.version = extractVersion(navigator.userAgent, /MSIE (\d+).(\d+)/, 1)
    } else if (navigator.userAgent.match(/rv:(\d+)/)) {
      result.version = extractVersion(navigator.userAgent, /rv:(\d+).(\d+)/, 1)
    }
  } else if (navigator.mozGetUserMedia) {
    result.browser = 'firefox'
    result.version = extractVersion(navigator.userAgent, /Firefox\/(\d+)\./, 1)
  } else if (navigator.webkitGetUserMedia && window.webkitRTCPeerConnection) {
    let isOpera = !!navigator.userAgent.match(/(OPR|Opera).([\d.]+)/)
    if (isOpera) {
      result.browser = 'opera'
      result.version = extractVersion(navigator.userAgent, /O(PR|pera)\/(\d+)\./, 2)
      if (navigator.userAgent.match(/Chrom(e|ium)\/([\d.]+)/)[2]) {
        result.chromeVersion = extractVersion(navigator.userAgent, /Chrom(e|ium)\/(\d+)\./, 2)
      }
    } else {
      result.browser = 'chrome'
      result.version = extractVersion(navigator.userAgent, /Chrom(e|ium)\/(\d+)\./, 2)
    }
  } else if ((!navigator.webkitGetUserMedia && navigator.userAgent.match(/AppleWebKit\/([0-9]+)\./)) || (navigator.webkitGetUserMedia && !navigator.webkitRTCPeerConnection)) {
    if (navigator.userAgent.match(/Version\/(\d+).(\d+)/)) {
      result.browser = 'safari'
      result.version = extractVersion(navigator.userAgent, /AppleWebKit\/(\d+)\./, 1)
    } else { // unknown webkit-based browser.
      result.browser = 'Unsupported webkit-based browser with GUM support but no WebRTC support.'
      return result
    }
  } else {
    result.browser = 'Not a supported browser.'
    return result
  }

  return result
}

// export default Recorder
