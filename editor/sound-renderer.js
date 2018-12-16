angular.module('mainApp').factory('SoundFactory', ($rootScope) => {
    const service = {
        currentPlayer: {},
        currentTimeout: null,
        maxSeconds: 50
    };
    const allNotes = Object.keys($rootScope.keyNotes);

    service.play = (configuration, secLength) => {
        configuration.tracks.forEach(track => {
            const osc = _readyTrack(track);
            track.osc = osc;

            const segments = _convertTrackToMilliSec(track, secLength);
            track.playSegments = segments;
        });

        _playTracks(configuration.tracks);

    };

    service.stop = (configuration) => {
        console.log('Stopping--------------');
        clearTimeout(service.currentTimeout);
        service.currentTimeout = null;
        configuration.tracks.forEach(track => {
            track.osc && track.osc.stop(1);
            track.osc = null;
        });
    };

    function _readyTrack(track) {
        // Invalid note
        if (!track.note || allNotes.indexOf(track.note) === -1) {
            return;
        }
        const osc = new p5.Oscillator();
        osc.setType('square');
        osc.freq($rootScope.keyNotes[track.note]);
        osc.amp(0);
        osc.start();

        return osc;
    }

    function _convertTrackToMilliSec(track, secLength) {
        return track.segments.map(seg => {
            return {
                start: parseInt(seg.start / secLength * 1000),
                end: parseInt(seg.end / secLength * 1000)
            }
        });
    }

    function _checkTrackSegements(segments, time) {
        return segments.filter(seg => {
            return seg.start <= time && seg.end >= time;
        }).length > 0;
    }

    function _playTracks(tracks, timer = 0) {
        service.currentPlayer.timer = timer;
        console.log('playing------------------', timer);
        tracks.forEach(track => {
            if (_checkTrackSegements(track.playSegments, timer)) {
                !track.__playing && track.osc.amp(0.8, 0.05);
                console.log('playing track----', track.name, track.__playing);
                track.__playing = true;
            } else {
                track.__playing && track.osc.amp(0, 0.5);
                track.__playing = false;
            }
        });

        service.currentTimeout = setTimeout(() => {
            timer += 50;
            if (timer > service.maxSeconds * 1000) {
                clearTimeout(service.currentTimeout);
                service.currentTimeout = null;
                return;
            }
            _playTracks(tracks, timer);
        }, 50);
    }

    return service;
})