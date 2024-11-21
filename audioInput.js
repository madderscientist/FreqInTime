// 用法：调用AudioInput.register()，返回一个Promise，resolve后可以getTimeData和getFrequencyData
function AudioInput(audioctx = null, fftSize = 2048) {
    this.audioContext = audioctx;
    this.analyser = null;
    this.stream = null;
    this.source = null;
    this.devices = null;
    this.buffer = new Float32Array(fftSize);

    this.getThatMedia = (deviceId = 'default') => {
        // 释放资源，切换设备前都需要停止当前的音频流（停止录制）
        if (this.stream) {
            let tracks = this.stream.getAudioTracks();
            for (const track of tracks) {
                track.stop();
            }
        }
        // https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints
        return navigator.mediaDevices.getUserMedia({
            audio: {
                // 如果要默认设备则不写或default(默认设备的id就是default)
                // 是ConstrainDOMString类型，可以接收一个字符串、一个字符串数组、一个有extract(值为deviceID)和ideal属性的对象
                deviceId: deviceId,
                channelCount: 2,
                autoGainControl: false,     // 自动增益控制，关闭是为了更原始的音频数据
                echoCancellation: false,    // 是否启用回声消除，指的是扬声器的声音会不会被麦克风捕捉到
                latency: 0,         // 延迟为0，表示尽可能快地返回数据
                noiseSuppression: false,
                sampleRate: this.audioContext.sampleRate,  // 采样率
                sampleSize: 16,     // 数据的位数 量化精度 虽然analyserNode返回的都是Float32
                // volume: 1.0         // 音量可接受的值 1.0 为最大值 但是此属性已经被废弃
            },
            video: false
        }).then((stream) => {
            if (this.source) this.source.disconnect();
            this.stream = stream;
            this.source = this.audioContext.createMediaStreamSource(stream);
            this.source.connect(this.analyser);

            let audioTracks = this.stream.getAudioTracks();
            // 直接获取的id是乱七八糟的，getSettings()后才是真正的设备id
            console.log(`Using audio device: ${audioTracks[0].label}, id: ${audioTracks[0].getSettings().deviceId}`);
        }); // 不做catch，交给调用者处理
    };

    this.getTimeData = (buf) => {
        const buffer = buf || this.buffer;
        // 实际有fftSize个数据
        this.analyser.getFloatTimeDomainData(buffer);
        return buffer;
    };

    this.getFrequencyData = (buf) => {
        const buffer = buf || this.buffer;
        // 但是实际只会有fftSize/2个数据
        this.analyser.getFloatFrequencyData(buffer);
        return buffer;
    }

    this.init = () => {
        if (!this.audioContext) {
            this.audioContext = new AudioContext();
        }
        if (!this.analyser) {
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = fftSize;
        }
        // enumerateDevices单独调用，但是如果没有getUserMedia的授权，返回的device没有ID。此外要求https
        return this.getThatMedia()
            .then(() => navigator.mediaDevices.enumerateDevices())
            .then((deviceInfos) => {
                this.devices = deviceInfos;
                for (const deviceInfo of deviceInfos) {
                    if (deviceInfo.kind != "audioinput") continue;
                    console.log(`kind: ${deviceInfo.kind}, label: ${deviceInfo.label}, id: ${deviceInfo.deviceId}`);
                }
            });
    };

    this.register = () => {
        return new Promise((resolve, reject) => {
            // 浏览器需要用户操作后才能创建AudioContext
            var firstClick = (e) => {
                document.removeEventListener("click", firstClick);
                this.init().then(resolve).catch(reject);
            }
            document.addEventListener("click", firstClick);
        });
    }
}
// 关于兼容性：要调用媒体设备，手机浏览器只认HTTPS，电脑浏览器倒是无所谓