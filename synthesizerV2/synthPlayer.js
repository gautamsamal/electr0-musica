class GainADSR {
    constructor() {
        this.a = 0.05;
        this.d = 0.05;
        this.s = 1;
        this.r = 0.1;
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
}

angular.module('mainApp').factory('SynthV2Factory', ($rootScope) => {
    const service = {
        currentContext: null
    };

    service.getChannel = function () {
        return new AudioChannel();
    };

    return service;
});