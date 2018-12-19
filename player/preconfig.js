angular.module('mainApp').factory('SynthJSONFactory', ($rootScope) => {
    const service = {
        notes: {
            'kick': {
                "type": "osc",
                "gain": {
                    "a": 0.01,
                    "d": 0.5,
                    "s": 1,
                    "r": 0,
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
                    "duration": null,
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
                    "duration": null,
                    "loop": true
                }
            ]
        }
    };
    return service;
});