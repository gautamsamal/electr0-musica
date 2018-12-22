class AudioBeat {
    constructor(context, delay = 0, duration, startAfter = 0) {
        if (!context || !context instanceof AudioContext) {
            throw new Error('Invalid audio context');
        }
        this.context = context;
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
        this.gain.gain.exponentialRampToValueAtTime(this.s, offSet + this.a + this.d);
        // Decay
        if (this.r && this.r > 0) {
            this.gain.gain.exponentialRampToValueAtTime(0.001, offSet + this.a + this.d + this.r);
        } else if (duration && duration > 0) {
            this.gain.gain.exponentialRampToValueAtTime(0.001, offSet + this.a + this.d + duration);
        }

    }

    connectOutput() {
        this.gain.connect(this.context.destination);
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
    constructor(context, type = 'sine', delay = 0, duration, startAfter = 0) {
        super(context, delay, duration, startAfter);
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
        this.gainADSR.connectOutput();
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
    constructor(context, type, delay = 0, duration, startAfter = 0, loop, playbackrate = 1) {
        super(context, delay, duration, startAfter);
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
        this.gainADSR.setup(this.context, this.audioBuffer, this.offSet);
        if (!this.duration) {
            this.duration = this.gainADSR.gainDuration;
        }
        this.gainADSR.connectOutput();
    }

    playNoise(gainADSR) {
        if (!this.duration) {
            this.duration = gainADSR.gainDuration;
        }
        this.audioBuffer.buffer = this.createBufferSource();
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
        this.timerWorker;
    }

    static parseJSON(json) {
        const instance = new AudioChannel();
        Object.assign(instance, json);
        instance.gain = instance.gain ? GainADSR.parseJSON(instance.gain) : new GainADSR();
        instance.frequency = instance.frequency ? FrequencyStream.parseJSON(instance.frequency) : new FrequencyStream();
        return instance;
    }

    /**
     * Configure and play the channel
     * @param {AudioContext} context
     */
    configure(context) {
        const scheduleAheadTime = 0.05;
        this.originalDelay = this.delay;

        this._setUpInitialRepeatTime();

        let playback = function () { };
        if (this.type === 'osc') {
            playback = this._playOscChannel;
        }

        if (this.type === 'noise') {
            playback = this._playNoiseChannel;
        }

        playback.call(this, context);
        if (this.loop) {
            this._scheduleAndLoop(context, scheduleAheadTime, playback);
        }
        return this;
    }

    _setUpScheduler(schedule) {
        const timerWorker = new Worker("player/worker.js");
        timerWorker.onmessage = function (e) {
            if (e.data == "tick") {
                // console.log("tick!");
                schedule();
            }
            else
                console.log("message: " + e.data);
        };
        timerWorker.postMessage({ "interval": 25 }); //25 milliseconds
        this.timerWorker = timerWorker;
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
        this._setUpScheduler(() => {
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
        const osc = new Oscillator(context, this.wave, this.delay, this.duration, this.startAfter);
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
        const noise = new BufferPlayer(context, this.type, this.delay, this.duration, this.startAfter, this.loop);
        const bufferNode = noise.getBufferSourceNode();
        bufferNode.onended = function () {
            // console.log('Buffer Ended', context.currentTime);
        };

        // Will create a new buffer if not provided.
        noise.playNoise(this.gain);
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

    service.playChannels = function (channels) {
        // Stop all players first
        service.stop();
        const context = new AudioContext;
        service.currentContext = context;
        channels.forEach(channel => {
            if (channel.mute) {
                return;
            }

            const channelInstance = AudioChannel.parseJSON(channel).configure(context);
            if (channelInstance.timerWorker) {
                timerWorkers.push(channelInstance.timerWorker);
            }
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

    return service;
});