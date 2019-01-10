class GainADSR {
    constructor() {
        this.enabled = true;
        this.a = 0.05;
        this.d = 0.2;
        this.s = 0.2;
        this.r = 1.5;
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
}
class AudioChannel {
    constructor() {
        this.type = 'osc';
        this.wave = 'sine';
        this.frequency = 440;
        this.detune = 0;
        this.masterVolume = 1;
        this.gain = new GainADSR();
        this.delay = 0;
        this.loop = false;
        this.startAfter = 0;
        this.duration = 0;
        this.url;
        this.timerWorker;
        this.base64Src;

        this.filter = {
            enabled: false,
            frequencyValue: 1,
            qualityValue: 0,
            type: 'lowpass'
        };
        this.effects = {
            enabled: false,
            bass: 0,
            treble: 0,
            distortion: 0
        }
        this.modulation = {
            enabled: false,
            wave: 'sine',
            frequency: 440,
            detune: 0
        }
    }

    static parseJSON(json) {
        const instance = new AudioChannel();
        Object.assign(instance, json);
        instance.gain = instance.gain ? GainADSR.parseJSON(instance.gain) : new GainADSR();
        return instance;
    }

    fixDurationAndDelay() {
        let offSet = isNaN(this.delay) ? 0 : parseFloat(this.delay);
        let startAfter = isNaN(this.startAfter) ? 0 : parseFloat(this.startAfter);
        let duration = this.duration ? parseFloat(parseFloat(this.duration).toFixed(2)) : null;

        offSet += startAfter;
        return { offSet, duration };
    }

    preConfigure(context) {
        return new Promise((resolve, reject) => {
            try {
                if ((this.type === 'external' || this.type === 'upload') && this.base64Src) {
                    //Convert base64 to Array buffer.
                    const buffer = Utils.base64ToArrayBuffer(this.base64Src);
                    return context.decodeAudioData(buffer, (buf) => {
                        this.buffer = buf;
                        resolve();
                    });
                }
                return resolve();
            } catch (err) {
                reject(err);
            }
        });
    }

    /**
     * Configure and play the channel
     * @param {AudioContext} context
     */
    configure(context, destination) {
        const scheduleAheadTime = 0.01;
        this.originalDelay = this.delay;
        this.destination = destination;

        this._setUpInitialRepeatTime();

        let playback;
        if (this.type === 'osc') {
            playback = this._playOscChannel;
        }

        if (this.type === 'noise') {
            playback = this._playNoiseChannel;
        }

        if (this.type === 'external' || this.type === 'upload') {
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
        if (!this.duration) {
            if (this.gain.enabled) {
                this.duration = this.gain.gainDuration;
            } else {
                this.duration = 1;
            }
        }
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
                // this.delay = this.nextPlayTime + this.originalDelay;
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

    _getNoiseBuffer(context, duration) {
        // Create an empty (duration) stereo/mono buffer at the sample rate of the AudioContext
        const arrayBuffer = context.createBuffer(context.destination.channelCount, context.sampleRate * duration, context.sampleRate);

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

    _connectADSR(context) {
        if (!this.gain.enabled) {
            return;
        }

        console.log('ADSR Connected');

        const adsrEnv = new ADSREnv(context, this.gain);
        this.output.connect(adsrEnv);
        this.output = adsrEnv;
    }

    _connectFilterBasedOnParams(context, type, frequencyValue, qualityValue, gain) {
        const filter = new Filter(context, type, frequencyValue, qualityValue, gain);
        this.output.connect(filter);
        this.output = filter;
    }

    _connectFilters(context) {
        if (!this.filter.enabled) {
            return;
        }

        // Convert frequency range 0-1 to actual frequency range
        // Clamp the frequency between the minimum value (40 Hz) and half of the
        // sampling rate.
        var minValue = 40;
        var maxValue = context.sampleRate / 2;
        // Logarithm (base 2) to compute how many octaves fall in the range.
        var numberOfOctaves = Math.log(maxValue / minValue) / Math.LN2;
        // Compute a multiplier from 0 to 1 based on an exponential scale.
        var multiplier = Math.pow(2, numberOfOctaves * (this.filter.frequencyValue - 1.0));
        // Get back to the frequency value between min and max.
        const frequency = maxValue * multiplier;

        console.log('Filters Connected');

        this._connectFilterBasedOnParams(context, this.filter.type, frequency, this.filter.qualityValue);
    }

    _connectEffects(context) {
        if (!this.effects.enabled) {
            return;
        }

        if (this.effects.bass) {
            console.log('Effects Bass Connected');
            // Increasing bass in order of 50
            const bass = this.effects.bass * 50;
            this._connectFilterBasedOnParams(context, 'lowshelf', 200, 1, bass);
        }

        if (this.effects.treble) {
            console.log('Effects Treble Connected');
            // Increasing bass in order of 50
            const treble = this.effects.treble * 50;
            this._connectFilterBasedOnParams(context, 'highshelf', 1500, 1, treble);
        }

        if (this.effects.distortion) {
            console.log('Effects Distortion Connected');
            // Increasing bass in order of 500
            const distortionVal = this.effects.distortion * 500;
            const distortion = new WaveShaper(context, distortionVal);
            this.output.connect(distortion);
            this.output = distortion;
        }
    }

    _connectModulator(context) {
        if (!this.modulation.enabled) {
            return;
        }

        console.log('Mosulator Connected');

        const modulationOsc = new ModulatingOscillator(context, this.modulation.wave, this.modulation.frequency, this.modulation.detune);
        this.output.connect(modulationOsc);
        this.output = modulationOsc;
        // Store modulation oscillator
        this.modulationOsc = modulationOsc.getOsc();
    }

    _connectAllDots(context) {
        const masterVol = new MasterVolume(context, this.masterVolume, this.destination);
        // Connect Modulator
        this._connectModulator(context);
        // Connect effects
        this._connectEffects(context);
        // Connect filters
        this._connectFilters(context);
        // Connect gain
        this._connectADSR(context);

        this.output.connect(masterVol);
    }

    _playModulatingOsc(context) {
        if (!this.modulationOsc) {
            return;
        }
        const { offSet, duration } = this.fixDurationAndDelay();
        // Start the oscillator
        this.modulationOsc.start(offSet);
        this.modulationOsc.stop(offSet, duration);
    }

    /**
     * Play Oscillator channel.
     * @param {AudioContext} context Audio Context
     */
    _playOscChannel(context) {
        // Oscillator
        console.log('OSC config', this);
        const { offSet, duration } = this.fixDurationAndDelay();
        // For loop count
        if (!this.loopCount) {
            this.loopCount = 0;
        }
        this.loopCount++;

        const osc = new Oscillator(context, this.wave, this.frequency, this.detune, this.frequencyDelay);
        if (this.output) {
            this.output.disconnect();
            this.output = null;
        }
        this.output = osc;

        this._connectAllDots(context);

        // Start the oscillator
        osc.start(offSet);
        osc.stop(offSet, duration);
        this._playModulatingOsc();
    };

    /**
     * Plays buffer based noise
     * @param {AudioContext} context Audio Context
     */
    _playNoiseChannel(context) {
        // Noise
        console.log('Noise config', this);
        const buffer = this._getNoiseBuffer(context, this.duration);
        this._playExternalChannel(context, buffer);
    };

    _playExternalChannel(context, buffer) {
        // Noise
        console.log('Buffer config', this);
        const { offSet, duration } = this.fixDurationAndDelay();
        // For loop count
        if (!this.loopCount) {
            this.loopCount = 0;
        }
        this.loopCount++;

        const buffPlayer = new BufferPlayer(context, buffer || this.buffer);

        if (this.output) {
            this.output.disconnect();
            this.output = null;
        }

        this.output = buffPlayer;

        this._connectAllDots(context);

        // Start the oscillator
        buffPlayer.start(offSet);
        buffPlayer.stop(offSet, duration);
        this._playModulatingOsc();
    };
}

angular.module('mainApp').factory('SynthV2Factory', ($rootScope) => {
    const service = {
        currentContext: null
    };

    let timerWorkers = [];
    let promiseArray = [];

    service.getChannel = function () {
        return new AudioChannel();
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
                if ((channel.type === 'external' || channel.type === 'upload') && !channel.buffer) {
                    return;
                }
                const channelInstance = channel.configure(context, destination);
                if (channelInstance.timerWorker) {
                    timerWorkers.push(channelInstance.timerWorker);
                }
            });
        }).catch(err => {
            console.log(err);
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
                Utils.convertFileToArrayBuffer(blob, function (buffer) {
                    $rootScope.$broadcast('Record:Timer:Done', buffer);
                });
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