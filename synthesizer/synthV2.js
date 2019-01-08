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

class Oscillator extends AudioBaseNode {
    constructor(context, type, frequency, detune) {
        super(context);
        this._oscNode = this.output = this.context.createOscillator();
        const options = Object.assign(this.__getDefaults(), { type, frequency, detune });

        this.frequency = this._oscNode.frequency;
        this.frequency.value = options.frequency;
        this.detune = this._oscNode.detune;
        this.detune.value = options.detune;
        this._oscNode.type = options.type;
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

        this._mainOsc = new Oscillator(context, type, frequency, detune);
        this._mainGain = new Gain(context);

        this._modulationOsc = new Oscillator(context, modulationType, frequency * frequencyRatio, detune);

        this._modulationOsc.connect(this._mainGain, 'param');
        this._mainOsc.connect(this._mainGain);

        this.output = this._mainGain.output;
        // this._mainGain.connect(this.masterVol);
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
        frequency: 261.63,
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
