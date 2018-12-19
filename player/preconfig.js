angular.module('mainApp').factory('SynthJSONFactory', ($rootScope) => {
    const service = {
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
    };
    return service;
});