class AudioBaseNode {
    constructor(context) {
        this.context = context;
        // this.masterVol = masterVol;
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
            // this.frequency.value = 0;
            this.frequency.exponentialRampToValueAtTime(options.frequency, frequencyDelay);
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

    start() {
        this._oscNode.start();
    }
}

//Master volume for one or more channels
class MasterVolume {
    constructor(context, destination) {
        this.context = context;
        this.masterVol = new Gain(context);
        this.input = this.masterVol.input;
        this.masterVol.connect(destination || this.context.destination, null);
    }
}

class ModulatingOscillator extends AudioBaseNode {
    constructor(context, { type, frequency, detune, frequencyRatio, modulationType }) {
        super(context);

        this._mainOsc = new Oscillator(context, type, frequency, detune, 0.05);
        this._modulationOsc = new Oscillator(context, modulationType, frequency * frequencyRatio, detune, 0.05);
        this._mainGain = new Gain(context);

        // Add a slight distortion
        this._waveShaper = new WaveShaper(context, 10);
        this._modulationOsc.connect(this._waveShaper);
        this._waveShaper.connect(this._mainGain, 'param');

        this._mainOsc.connect(this._mainGain);

        this.output = this._mainGain.output;
    }

    start() {
        this._mainOsc.start();
        this._modulationOsc.start();
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
        if (a && a > 0) {
            this.rampValueAtTime(1, a, 'linear');
        } else {
            this.setValueAtTime(1, 0);
        }

        if (d && d > 0 && s && s > 0) {
            this.rampValueAtTime(s, (a + d));
        }

        if (r && r > 0) {
            this.rampValueAtTime(0.000001, (a + d + r));
        }
    }
}

// Players



// Testing Platform

function playSound() {
    // alert(1);
    // return;
    const context = new AudioContext();
    const masterVol = new MasterVolume(context);
    const modOsc = new ModulatingOscillator(context, {
        type: 'triangle',
        frequency: 349.23,
        detune: 0,
        frequencyRatio: 0.5,
        modulationType: 'sine'
    });

    const env = new ADSREnv(context, {
        a: 0.05,
        d: 0.2,
        s: 0.2,
        r: 1.5
    });

    modOsc.connect(env);
    env.connect(masterVol);

    modOsc.start();
}
