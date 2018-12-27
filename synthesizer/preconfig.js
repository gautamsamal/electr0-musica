angular.module('mainApp').factory('SynthJSONFactory', ($rootScope) => {
    const service = {
        notes: {
            'kick': {
                "type": "osc",
                "gain": {
                    "a": 0,
                    "d": 0.5,
                    "s": 1,
                    "r": 0.01,
                    "egMode": 1
                },
                "frequency": {
                    "frequencies": [
                        {
                            "time": 0,
                            "frequency": 150
                        },
                        {
                            "time": 0.5,
                            "frequency": 0.01
                        }
                    ]
                },
                "delay": 0,
                "wave": "sine"
            },
            'external': {
                "gain": {
                    "amp": 1,
                    "a": 0.1,
                    "d": 0,
                    "s": 1,
                    "r": 0,
                    "egMode": 1
                },
                "delay": 0,
                "type": "external",
                "loop": false,
                "startAfter": 0,
                "duration": 60,
                "playbackrate": 1,
                "url": "http://staticcrate.com/content/audio-pro/soundscrate-happy-marimba.mp3"
            },
            'drum-kicks1': {
                "gain": {
                    "amp": 1,
                    "a": 0.45,
                    "d": 0.05,
                    "s": 1,
                    "r": 0.5,
                    "egMode": 1
                },
                "frequency": {
                    "frequencies": [
                        {
                            "time": 0,
                            "frequency": 440
                        }
                    ]
                },
                "filter": {
                    "enabled": true,
                    "frequencyValue": 0.33,
                    "qualityValue": 0.38
                },
                "delay": 0,
                "wave": "sine",
                "type": "noise",
                "loop": true,
                "disableADSR": false,
                "startAfter": 0,
                "duration": 0,
                "playbackrate": 1,
                "fileName": "music_zapsplat_electric_drum_and_bass.mp3",
                "limitRepeatCount": 5
            },
            'drum-kicks2': {
                "gain": {
                    "amp": 1,
                    "a": 0.45,
                    "d": 0.05,
                    "s": 1,
                    "r": 0.5,
                    "egMode": 1
                },
                "frequency": {
                    "frequencies": [
                        {
                            "time": 0,
                            "frequency": 440
                        }
                    ]
                },
                "filter": {
                    "enabled": true,
                    "frequencyValue": 0.52,
                    "qualityValue": 0
                },
                "delay": 0,
                "wave": "sine",
                "type": "noise",
                "loop": true,
                "disableADSR": false,
                "startAfter": 0.5,
                "duration": 0,
                "playbackrate": 1,
                "limitRepeatCount": 5
            }
        },
        full: {
            'sample': [
                {
                    "gain": {
                        "a": 0.27,
                        "d": 0.1,
                        "s": 0.11,
                        "r": 0.23,
                        "egMode": 1
                    },
                    "delay": 0,
                    "type": "noise",
                    "mute": false,
                    "duration": 0.6,
                    "loop": true
                },
                {
                    "type": "osc",
                    "gain": {
                        "a": 0.01,
                        "d": 0.55,
                        "s": 1,
                        "r": 0.03,
                        "egMode": 1
                    },
                    "frequency": {
                        "frequencies": [
                            {
                                "time": 0,
                                "frequency": 110,
                            }
                        ]
                    },
                    "delay": 0,
                    "wave": "triangle",
                    "mute": false,
                    "duration": 0.6,
                    "loop": true
                },
                {
                    "type": "osc",
                    "gain": {
                        "a": 0.47,
                        "d": 0,
                        "s": 0.44,
                        "r": 0.12,
                        "egMode": 1
                    },
                    "frequency": {
                        "frequencies": [
                            {
                                "time": 0,
                                "frequency": 441,
                            }
                        ]
                    },
                    "delay": 0,
                    "wave": "sine",
                    "duration": 0.6,
                    "loop": true
                }
            ]
        }
    };
    return service;
});