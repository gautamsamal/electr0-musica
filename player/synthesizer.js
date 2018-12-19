class AudioBeat {
    constructor(context, delay = 0, duration) {
        if (!context || !context instanceof AudioContext) {
            throw new Error('Invalid audio context');
        }
        this.context = context;
        this.delay = parseFloat(delay);
        this.duration = duration ? parseFloat(parseFloat(duration).toFixed(2)) : null;
    }
}

class GainADSR {
    constructor() {
        this.a = 0.05;
        this.d = 0.05;
        this.s = 1;
        this.r = 0.1;
        this.egMode = 1; // Not implemented
    }

    static parseJSON({ a, d, s, r, egMode }) {
        const instance = new GainADSR();
        return Object.assign(instance, { a, d, s, r, egMode });
    }

    get gainDuration() {
        return parseFloat((this.a + this.d + this.r).toFixed(2));
    }

    setup(context, source, delay = 0, duration) {
        this.context = context;
        this.gain = this.context.createGain();
        if (source) {
            this.source = source;
            source.connect(this.gain);
        }

        this.gain.gain.value = 0;
        if (!this.a || this.a === 0) {
            this.a = 0;
            this.gain.gain.setValueAtTime(1, delay);
        } else {
            this.gain.gain.exponentialRampToValueAtTime(1, delay + this.a);
        }
        this.gain.gain.exponentialRampToValueAtTime(this.s, delay + this.a + this.d);
        if (this.r && this.r > 0) {
            this.gain.gain.exponentialRampToValueAtTime(0.001, delay + this.a + this.d + this.r);
        } else if (duration && duration > 0) {
            this.gain.gain.exponentialRampToValueAtTime(0.001, delay + this.a + this.d + duration);
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

    setup(osc, delay = 0) {
        this.osc = osc;
        const zeroTimeFreq = this.frequencies.find(f => f.time === 0);
        // Initial frequency
        osc.frequency.setValueAtTime((zeroTimeFreq.frequency || 0), delay);
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
            osc.frequency.exponentialRampToValueAtTime(freq, delay + f.time);
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
    constructor(context, type = 'sine', delay = 0, duration) {
        super(context, delay, duration);
        this.type = type;
        this.osc = this.context.createOscillator();
    }

    getOsc() {
        return this.osc;
    }

    setupGain(gainADSR) {
        this.gainADSR = gainADSR;
        this.gainADSR.setup(this.context, this.osc, this.delay);
        if (!this.duration) {
            this.duration = this.gainADSR.gainDuration;
        }
        this.gainADSR.connectOutput();
    }

    setupFrequency(frequencyStream) {
        this.frequencyStream = frequencyStream;
        this.frequencyStream.setup(this.osc, this.delay);
    }

    play(gainADSR, frequencyStream) {
        this.setupGain(gainADSR);
        this.setupFrequency(frequencyStream);
        this.osc.start(this.delay);
        this.osc.stop(this.delay + this.duration);

    }
}

class BufferPlayer extends AudioBeat {
    constructor(context, type, delay = 0, duration, loop, playbackrate = 1) {
        super(context, delay, duration);
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
        this.gainADSR.setup(this.context, this.audioBuffer, this.delay);
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
        this.audioBuffer.start(this.delay);
        // No need to stop as the buffer automatically will run out.
        // this.audioBuffer.stop(this.delay + this.duration);
    }
}

/**
 * Angular Factory
 */
angular.module('mainApp').factory('SynthFactory', ($rootScope, SynthJSONFactory) => {
    const service = {
        currentContext: null
    };

    service.getChannel = function () {
        // return {
        //     gain: new GainADSR(),
        //     frequency: new FrequencyStream(),
        //     delay: 0,
        //     wave: 'sine',
        //     type: 'osc',
        //     loop: true
        // }
        return {
            gain: new GainADSR(),
            delay: 0,
            type: 'noise'
        }
    };

    service.parsePredefinedChannel = function (note) {
        if (!SynthJSONFactory[note]) {
            alert('Specified note not found');
            return;
        }

        const channel = angular.copy(SynthJSONFactory[note]);
        channel.gain = channel.gain ? GainADSR.parseJSON(channel.gain) : new GainADSR();
        channel.frequency = channel.frequency ? FrequencyStream.parseJSON(channel.frequency) : new FrequencyStream();
        return channel;
    };

    service.playChannels = function (channels) {
        const context = new AudioContext;
        service.currentContext = context;
        channels.forEach(channel => {
            if (channel.mute) {
                return;
            }
            if (channel.type === 'osc') {
                const copyChannel = angular.copy(channel);
                copyChannel.originalDelay = channel.delay;
                _playOscChannel(context, copyChannel);
            }

            if (channel.type === 'noise') {
                const copyChannel = angular.copy(channel);
                copyChannel.originalDelay = channel.delay;
                _playNoiseChannel(context, copyChannel);
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
    };

    function _playOscChannel(context, channel) {
        // For loop count
        if (!channel.loopCount) {
            channel.loopCount = 0;
        }
        channel.loopCount++;

        // Oscillator
        const osc = new Oscillator(context, channel.wave, channel.delay, channel.duration);
        const oscillator = osc.getOsc();
        oscillator.onended = function () {
            console.log('OSC Ended', context.currentTime);
            if (channel.loop) {
                channel.delay = context.currentTime + channel.originalDelay;
                _playOscChannel(context, channel);
            }
        };
        osc.play(channel.gain, channel.frequency);
    };

    function _playNoiseChannel(context, channel) {
        // For loop count
        if (!channel.loopCount) {
            channel.loopCount = 0;
        }
        channel.loopCount++;
        // Noise
        const noise = new BufferPlayer(context, channel.type, channel.delay, channel.duration, channel.loop);
        const bufferNode = noise.getBufferSourceNode();
        bufferNode.onended = function () {
            console.log('Buffer Ended', context.currentTime);
            if (channel.loop) {
                channel.delay = context.currentTime + channel.originalDelay;
                _playNoiseChannel(context, channel);
            }
        };

        // Will create a new buffer if not provided.
        noise.playNoise(channel.gain);
    };

    return service;
});