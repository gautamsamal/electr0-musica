class AudioBaseNode {
    constructor(context) {
        this.context = context;
    }

    /**
     * Connects an audio node to another audio node/destination
     * @param {AudioNode} destination
     */
    connect(destination, type = 'input') {
        if (!this.output) {
            throw new Error('Output is not defined');
        }

        let dest = destination;
        if (type === 'param') {
            dest = destination._param;
        } else if (type === 'input') {
            dest = destination.input;
        }

        this.output.connect(dest);
    }

    /**
     * Disconnects the destination
     * @param {AudioNode} destination
     */
    disconnect(destination) {
        if (!this.output) {
            throw new Error('Output is not defined');
        }

        this.output.disconnect(destination);
    }

    start(offset = 0, time = 0) {
        this.output.start(this.context.currentTime + offset + time);
    }

    stop(offset = 0, time = 0) {
        this.output.stop(this.context.currentTime + offset + time);
    }

}

class AudioConstant extends AudioBaseNode {
    constructor(context) {
        super(context);
        this._constantSource = this.output = this.context.createConstantSource();
        this._constantSource.start(0);
        this._param = this.input = this._constantSource.offset;
    }
}

class Gain extends AudioBaseNode {
    constructor(context) {
        super(context);
        this._gainNode = this.input = this.output = this.context.createGain();
        this._param = this._gainNode.gain;
    }

    setValueAtTime(value, time = 0) {
        this._param.setValueAtTime(value, time);
    }

    rampValueAtTime(value, time = 0, type = 'exponential') {
        if (type === 'exponential') {
            this._param.exponentialRampToValueAtTime(value, time);
        } else {
            this._param.linearRampToValueAtTime(value, time);
        }
    }
}

class WaveShaper extends AudioBaseNode {
    constructor(context, amount) {
        super(context);
        this._waveShaper = this.input = this.output = this.context.createWaveShaper();
        this._curve = this._waveShaper.curve = this.setup(amount);
        this._waveShaper.oversample = '4x';
    }

    setup(amount) {
        const curve = new Float32Array(this.context.sampleRate);
        const k = typeof amount === 'number' ? amount : 50;
        const deg = Math.PI / 180;
        let i = 0;
        let x;
        for (; i < curve.length; ++i) {
            x = i * 2 / curve.length - 1;
            curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
        }
        return curve;
    }
}

class Filter extends AudioBaseNode {
    constructor(context, type = 'lowpass', frequency = 220, quality = 0, gain = 1) {
        super(context);
        this._filter = this.input = this.output = this.context.createBiquadFilter();
        this._filter.type = type;
        this._filter.gain.value = gain;
        this.setup(frequency, quality);
    }

    setup(frequency, quality) {
        const QUAL_MUL = 30;
        // Frequency
        this._filter.frequency.value = frequency;
        // Gain
        this._filter.Q.value = quality * QUAL_MUL;
    }
}

class Oscillator extends AudioBaseNode {
    constructor(context, type, frequency, detune, frequencyDelay) {
        super(context);
        this._oscNode = this.output = this.context.createOscillator();
        const options = Object.assign(this.__getDefaults(), { type, frequency, detune });

        this.frequency = this._oscNode.frequency;
        this.detune = this._oscNode.detune;
        this.detune.value = options.detune;
        this._oscNode.type = options.type;

        if (frequencyDelay && frequencyDelay > 0) {
            this.frequency.value = 0.00001;
            this.frequency.exponentialRampToValueAtTime(options.frequency, this.context.currentTime + frequencyDelay);
        } else {
            this.frequency.value = options.frequency;
        }
    }

    __getDefaults() {
        return {
            type: 'sine',
            frequency: 440,
            detune: 0
        }
    }
}

class BufferPlayer extends AudioBaseNode {
    constructor(context, buffer) {
        super(context);
        this._bufferSource = this.output = this.context.createBufferSource();
        this._bufferSource.buffer = buffer;
    }
}

class ModulatingOscillator extends AudioBaseNode {
    constructor(context, modulationType, frequency, detune) {
        super(context);

        this._modulationOsc = new Oscillator(context, modulationType, frequency, detune, 0.05);
        this._mainGain = new Gain(context);

        // Add a slight distortion
        this._waveShaper = new WaveShaper(context, 10);
        this._modulationOsc.connect(this._waveShaper);
        this._waveShaper.connect(this._mainGain, 'param');
        this.input = this.output = this._mainGain.output;
    }

    getOsc() {
        return this._modulationOsc;
    }
}

class ADSREnv extends Gain {
    constructor(context, gainADSR) {
        super(context);
        this.gainADSR = gainADSR;
        this.setup();
    }

    setup() {
        const { a = 0, d = 0, s = 0, r = 0 } = this.gainADSR;
        this.setValueAtTime(0.00001, 0);
        if (a && a > 0) {
            this.rampValueAtTime(1, (this.context.currentTime + a));
        }

        if (d && d > 0 && s && s > 0) {
            this.rampValueAtTime(s, (this.context.currentTime + a + d));
        }

        if (r && r > 0) {
            this.rampValueAtTime(0.00001, (this.context.currentTime + a + d + r));
        }
    }
}

//Master volume for one or more channels
/**
 * Mainly a Gain only with only difference is that it connects with the destination provided.
 */
class MasterVolume extends Gain {
    constructor(context, value = 1, destination) {
        super(context);
        this.setValueAtTime(value, this.context.currentTime);
        this.connect(destination || this.context.destination, null);
    }
}
