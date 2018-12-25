class Utils {
    constructor() {

    }

    static setUpScheduler(schedule, interval) {
        const timerWorker = new Worker("utils/worker.js");
        timerWorker.onmessage = function (e) {
            if (e.data == "tick") {
                // console.log("tick!");
                schedule();
            }
            else
                console.log("message: " + e.data);
        };
        timerWorker.postMessage({ "interval": interval || 25 }); //25 milliseconds
        return timerWorker;
    }

    static convertBlobToAudioBuffer(context, blob, callback = () => { }) {
        let arrayBuffer;
        let fileReader = new FileReader();
        fileReader.onload = function (event) {
            arrayBuffer = event.target.result;
            context.decodeAudioData(arrayBuffer, function (buffer) {
                console.log('Buffer---', buffer)
                callback(null, buffer);
            }, function (e) {
                console.log("Error with decoding audio data" + e.err);
                callback(e);
            });
        };
        fileReader.readAsArrayBuffer(blob);
    }
}

class AudioBeat {
    constructor(context, destination, delay = 0, duration, startAfter = 0) {
        if (!context || !context instanceof AudioContext) {
            throw new Error('Invalid audio context');
        }
        this.context = context;
        this.destination = destination || this.context.destination;
        this.offSet = isNaN(delay) ? 0 : parseFloat(delay);
        this.startAfter = isNaN(startAfter) ? 0 : parseFloat(startAfter);
        this.duration = duration ? parseFloat(parseFloat(duration).toFixed(2)) : null;

        this.offSet = this.offSet + this.startAfter;
    }
}

class GainADSR {
    constructor() {
        this.amp = 1;
        this.a = 0.05;
        this.d = 0.05;
        this.s = 1;
        this.r = 0.1;
        this.egMode = 1; // Not implemented
    }

    static parseJSON(json) {
        Object.keys(json).forEach(k => {
            if (json[k] === null || json[k] === undefined) {
                delete json[k];
            }
        });
        const instance = new GainADSR();
        return Object.assign(instance, json);
    }

    get gainDuration() {
        return parseFloat((this.a + this.d + this.r).toFixed(2));
    }

    setup(context, source, offSet = 0, duration) {
        this.context = context;
        this.gain = this.context.createGain();
        if (source) {
            this.source = source;
            source.connect(this.gain);
        }

        this.gain.gain.value = 0;
        if (!this.a || this.a === 0) {
            this.a = 0;
            this.gain.gain.setValueAtTime(this.amp, offSet);
        } else {
            this.gain.gain.exponentialRampToValueAtTime(this.amp, offSet + this.a);
        }
        // Sustain
        if (this.d && this.d > 0) {
            this.gain.gain.exponentialRampToValueAtTime(this.s, offSet + this.a + this.d);
        }
        // Decay
        if (this.r && this.r > 0) {
            this.gain.gain.exponentialRampToValueAtTime(0.001, offSet + this.a + this.d + this.r);
        } else if (duration && duration > 0) {
            this.gain.gain.exponentialRampToValueAtTime(0.001, offSet + this.a + this.d + duration);
        }

    }

    connectOutput(destination) {
        this.gain.connect(destination || this.context.destination);
    }
}

class FrequencyStream {
    constructor(frequency = 440) {
        this.frequencies = [{
            time: 0,
            frequency: frequency
        }];
    }

    static parseJSON({ frequencies }) {
        const instance = new FrequencyStream();
        if (frequencies) {
            instance.frequencies = frequencies;
        }
        return instance;
    }

    setup(osc, offSet = 0) {
        this.osc = osc;
        const zeroTimeFreq = this.frequencies.find(f => f.time === 0);
        // Initial frequency
        osc.frequency.setValueAtTime((zeroTimeFreq.frequency || 0), offSet);
        this.frequencies.forEach(f => {
            if (f.time === null || f.time === undefined) {
                return;
            }
            if (f.frequency === null || f.frequency === undefined) {
                return;
            }
            if (f.time === 0) {
                return;
            }
            const freq = f.frequency || 0.001; // Zero is not accepted for exponential decay/increase
            osc.frequency.exponentialRampToValueAtTime(freq, offSet + f.time);
        });
    }

    add(time, frequency) {
        const existing = this.frequencies.find(f => f.time === time);
        if (existing) {
            existing.frequency = frequency;
        } else {
            this.frequencies.push({
                time: time,
                frequency: frequency
            });
        }
    }

    remove(index) {
        if (this.frequencies[index]) {
            this.frequencies.splice(index, 1);
        }
    }
}

class Oscillator extends AudioBeat {
    constructor(context, destination, type = 'sine', delay = 0, duration, startAfter = 0) {
        super(context, destination, delay, duration, startAfter);
        this.type = type;
        this.osc = this.context.createOscillator();
    }

    getOsc() {
        return this.osc;
    }

    setupGain(gainADSR) {
        this.gainADSR = gainADSR;
        this.gainADSR.setup(this.context, this.osc, this.offSet, this.duration);
        if (!this.duration) {
            this.duration = this.gainADSR.gainDuration;
        }
        this.gainADSR.connectOutput(this.destination);
    }

    setupFrequency(frequencyStream) {
        this.frequencyStream = frequencyStream;
        this.frequencyStream.setup(this.osc, this.offSet);
    }

    play(gainADSR, frequencyStream) {
        this.setupGain(gainADSR);
        this.setupFrequency(frequencyStream);
        this.osc.start(this.offSet);
        this.osc.stop(this.offSet + this.duration);
        console.log('OSC would satrt at', this.offSet);
        console.log('OSC would stop at', this.offSet + this.duration);
    }
}

class BufferPlayer extends AudioBeat {
    constructor(context, destination, type, delay = 0, duration, startAfter = 0, loop, playbackrate = 1) {
        super(context, destination, delay, duration, startAfter);
        this.loop = loop;
        this.type = type;
        this.audioBuffer = this.context.createBufferSource();
        // Not applicable for noise buffer.
        if (this.type === 'noise') {
            return;
        }
        if (this.loop) {
            this.audioBuffer.loop = true;
        }
        if (playbackrate && !isNaN(playbackrate)) {
            this.audioBuffer.playbackRate.value = parseFloat(playbackrate);
        }
    }

    static loadFromHTTP(url, context, callback) {
        var request = new XMLHttpRequest();
        request.open('get', url, true);
        request.responseType = 'arraybuffer';

        request.onload = function () {
            context.decodeAudioData(request.response, function (buffer) {
                callback(null, buffer);
            });
        };
        request.onerror = function (err) {
            console.log("** An error occurred during the transaction");
            callback(err)
        };
        request.send();
    };

    createBufferSource() {
        // Create an empty (duration) stereo/mono buffer at the sample rate of the AudioContext
        const arrayBuffer = this.context.createBuffer(this.context.destination.channelCount, this.context.sampleRate * this.duration, this.context.sampleRate);

        // Fill the buffer with white noise;
        // just random values between -1.0 and 1.0
        for (let channel = 0; channel < arrayBuffer.numberOfChannels; channel++) {
            // This gives us the actual array that contains the data
            const nowBuffering = arrayBuffer.getChannelData(channel);
            for (let i = 0; i < arrayBuffer.length; i++) {
                // Math.random() is in [0; 1.0]
                // audio needs to be in [-1.0; 1.0]
                nowBuffering[i] = Math.random() * 2 - 1;
            }
        }

        return arrayBuffer;
    }

    getBufferSourceNode() {
        return this.audioBuffer;
    }

    setupGain(gainADSR) {
        this.gainADSR = gainADSR;
        this.gainADSR.setup(this.context, this.audioBuffer, this.offSet, this.duration);
        this.gainADSR.connectOutput(this.destination);
    }

    playNoise(gainADSR) {
        if (!this.duration) {
            this.duration = gainADSR.gainDuration;
        }
        this.audioBuffer.buffer = this.createBufferSource();
        this.setupGain(gainADSR);
        this.audioBuffer.start(this.offSet);
        this.audioBuffer.stop(this.offSet + this.duration);
        console.log('Noise would satrt at', this.offSet);
        console.log('Noise would stop at', this.offSet + this.duration);
    }

    playFromBuffer(buffer, gainADSR) {
        this.audioBuffer.buffer = buffer;
        this.setupGain(gainADSR);
        this.audioBuffer.start(this.offSet);
        this.audioBuffer.stop(this.offSet + this.duration);
        console.log('BUFF would satrt at', this.offSet);
        console.log('BUFF would stop at', this.offSet + this.duration);
    }
}

class AudioChannel {
    constructor() {
        this.gain = new GainADSR();
        this.frequency = new FrequencyStream();
        this.delay = 0;
        this.wave = 'sine';
        this.type = 'osc';
        this.loop = false;
        this.startAfter = 0;
        this.duration = 0;
        this.url;
        this.playbackrate = 1;
        this.timerWorker;
    }

    static parseJSON(json) {
        const instance = new AudioChannel();
        Object.assign(instance, json);
        instance.gain = instance.gain ? GainADSR.parseJSON(instance.gain) : new GainADSR();
        instance.frequency = instance.frequency ? FrequencyStream.parseJSON(instance.frequency) : new FrequencyStream();
        return instance;
    }

    preConfigure(context) {
        return new Promise((resolve, reject) => {
            if (this.type === 'external') {
                return BufferPlayer.loadFromHTTP(this.url, context, (err, buffer) => {
                    this.buffer = buffer;
                    if (err) {
                        return reject(err);
                    }
                    resolve();
                });
            }
            return resolve();
        })
    }

    /**
     * Configure and play the channel
     * @param {AudioContext} context
     */
    configure(context, destination) {
        const scheduleAheadTime = 0.05;
        this.originalDelay = this.delay;
        this.destination = destination;

        this._setUpInitialRepeatTime();

        let playback = function () { };
        if (this.type === 'osc') {
            playback = this._playOscChannel;
        }

        if (this.type === 'noise') {
            playback = this._playNoiseChannel;
        }

        if (this.type === 'external') {
            playback = this._playExternalChannel;
        }

        playback.call(this, context);
        if (this.loop) {
            this._scheduleAndLoop(context, scheduleAheadTime, playback);
        }
        return this;
    }

    /**
     * Initial repeat time for a channel.
     */
    _setUpInitialRepeatTime() {
        this.duration = this.duration || this.gain.gainDuration;
        this.totalDuration = (this.originalDelay || 0) + (this.duration);
        // For first time, we will wait extra startAfter
        this.nextPlayTime = parseFloat(this.totalDuration) + (this.startAfter || 0);
    }

    /**
     * Add a scheduler via web worker and check if we have a note in future to play.
     * @param {AudioContext} context Audio context
     * @param {number} scheduleAheadTime Time in sec to look ahead for next tone.
     * @param {function} playback Callback to play the note
     */
    _scheduleAndLoop(context, scheduleAheadTime, playback) {
        this.timerWorker = Utils.setUpScheduler(() => {
            if (this.nextPlayTime <= context.currentTime + scheduleAheadTime && this._checkRepeatCountOrSec(context.currentTime)) {
                this.startAfter = 0;
                this.delay = this.nextPlayTime + this.originalDelay;
                playback.call(this, context);
                this.nextPlayTime = parseFloat(this.nextPlayTime + this.totalDuration);
            }
        });
        this.timerWorker.postMessage("start");
    }

    /**
     * Check if we have repitation limit set and do we need to loop.
     * In case of secs starts time is excluded.
     * @param {number} currentTime Current audio time
     */
    _checkRepeatCountOrSec(currentTime) {
        if (this.limitRepeatCount && this.limitRepeatCount > 0 && this.loopCount >= this.limitRepeatCount) {
            return false;
        }
        if (this.limitRepeatSec && this.limitRepeatSec > 0 && (currentTime - this.startAfter || 0) > this.limitRepeatSec) {
            return false;
        }
        return true;
    }

    /**
     * Play Oscillator channel.
     * @param {AudioContext} context Audio Context
     */
    _playOscChannel(context) {
        // For loop count
        if (!this.loopCount) {
            this.loopCount = 0;
        }
        this.loopCount++;

        // Oscillator
        console.log('OSC config', this);
        const osc = new Oscillator(context, this.destination, this.wave, this.delay, this.duration, this.startAfter);
        const oscillator = osc.getOsc();
        oscillator.onended = function () {
            // console.log('OSC Ended', context.currentTime);
        };
        osc.play(this.gain, this.frequency);
    };

    /**
     * Plays buffer based noise
     * @param {AudioContext} context Audio Context
     */
    _playNoiseChannel(context) {
        // For loop count
        if (!this.loopCount) {
            this.loopCount = 0;
        }
        this.loopCount++;
        // Noise
        console.log('BUFF config', this);
        const noise = new BufferPlayer(context, this.destination, this.type, this.delay, this.duration, this.startAfter, this.loop);
        const bufferNode = noise.getBufferSourceNode();
        bufferNode.onended = function () {
            // console.log('Buffer Ended', context.currentTime);
        };

        // Will create a new buffer if not provided.
        noise.playNoise(this.gain);
    };

    _playExternalChannel(context) {
        // For loop count
        if (!this.loopCount) {
            this.loopCount = 0;
        }
        this.loopCount++;
        // Noise
        console.log('EXTERNAL config', this);
        const buffPlayer = new BufferPlayer(context, this.destination, this.type, this.delay, this.duration, this.startAfter, this.loop);
        const bufferNode = buffPlayer.getBufferSourceNode();
        bufferNode.onended = function () {
            console.log('Buffer Player Ended', context.currentTime);
        };

        // Will create a new buffer if not provided.
        buffPlayer.playFromBuffer(this.buffer, this.gain);
    };
}

/**
 * Angular Factory
 */
angular.module('mainApp').factory('SynthFactory', ($rootScope, SynthJSONFactory) => {
    const service = {
        currentContext: null
    };

    let timerWorkers = [];
    let promiseArray = [];

    service.getChannel = function () {
        return new AudioChannel();
    };

    service.parsePredefinedChannel = function (note) {
        if (!SynthJSONFactory.notes[note]) {
            alert('Specified note not found');
            return;
        }

        return AudioChannel.parseJSON(SynthJSONFactory.notes[note]);
    };

    service.getSampleTracks = function () {
        const origChannels = SynthJSONFactory.full.sample;

        return origChannels.map(c => {
            return AudioChannel.parseJSON(c);
        });
    };

    service.playChannels = function (channels, recordTime) {
        // Stop all players first
        service.stop();
        const channelInstances = [];
        promiseArray = channels.map(channel => {
            const parsedChannel = AudioChannel.parseJSON(channel);
            channelInstances.push(parsedChannel);
            return _prepareExternalFactors(parsedChannel);
        });
        Promise.all(promiseArray).then(() => {
            const context = new AudioContext;
            service.currentContext = context;
            const destination = _setUpRecorder(context, recordTime);

            channelInstances.forEach(channel => {
                if (channel.mute) {
                    return;
                }
                const channelInstance = channel.configure(context, destination);
                if (channelInstance.timerWorker) {
                    timerWorkers.push(channelInstance.timerWorker);
                }
            });
        }).catch(err => {
            alert('Error while processing channels');
        });
    };

    service.pause = function () {
        if (!service.currentContext)
            return;
        service.currentContext.suspend();
    };

    service.resume = function () {
        if (!service.currentContext)
            return;
        service.currentContext.resume();
    };

    service.stop = function () {
        if (!service.currentContext)
            return;
        service.currentContext.close();
        service.currentContext = null;
        timerWorkers.forEach(w => {
            w.postMessage('stop');
        });
        timerWorkers = [];
    };

    function _setUpRecorder(context, recordTime) {
        let destination;
        const chunks = [];
        if (recordTime && recordTime.start !== undefined && recordTime.start !== null
            && recordTime.end !== undefined && recordTime.end !== null) {
            destination = context.createMediaStreamDestination();
            const mediaRecorder = new MediaRecorder(destination.stream);
            let recordStarted = false;
            let recordStopped = false;

            const timeWorker = Utils.setUpScheduler(() => {
                $rootScope.$broadcast('Record:Timer:Update');
                if (recordTime.start <= context.currentTime + 0.01 && !recordStarted) {
                    console.log('Recorder started', context.currentTime);
                    mediaRecorder.start();
                    recordStarted = true;
                }
                if (recordTime.end <= context.currentTime && !recordStopped) {
                    console.log('Recorder stopped', context.currentTime);
                    mediaRecorder.stop();
                    recordStopped = true;
                    // Stop player
                    service.stop();
                }
            });
            timeWorker.postMessage("start");
            timerWorkers.push(timeWorker);

            //Events
            mediaRecorder.ondataavailable = function (evt) {
                console.log('getting data', evt.data);
                // push each chunk (blobs) in an array
                chunks.push(evt.data);
            };

            mediaRecorder.onstop = function (evt) {
                // Make blob out of our blobs, and open it.
                var blob = new Blob(chunks, { 'type': 'audio/ogg; codecs=opus' });
                document.querySelector("audio").src = URL.createObjectURL(blob);
                Utils.convertBlobToAudioBuffer(context, blob);
            };
        }
        return destination;
    }

    function _prepareExternalFactors(channel) {
        const context = new AudioContext;
        return channel.preConfigure(context);
    }

    return service;
});