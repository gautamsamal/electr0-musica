class AudioAnalyser {
    constructor(context) {
        this.context = context;
        this.analyser = context.createAnalyser();
        this.analyser.minDecibels = -90;
        this.analyser.maxDecibels = -10;
        this.analyser.smoothingTimeConstant = 0.85;
    }

    connect(destination) {
        this.analyser.connect(destination);
    }

    getAnalyser() {
        return this.analyser;
    }
}
class BufferTrackLoader {
    constructor(context, buffer, analyser) {
        this.context = context;
        this.buffer = Utils.cloneAudioBuffer(buffer);
        this.audioBuffer = this.context.createBufferSource();
        this.audioBuffer.buffer = this.buffer;

        this.analyser = analyser;
    }

    setup(amp = 1, offset = 0, start = 0, end = this.buffer.duration) {
        this.gain = this.context.createGain();
        this.gain.gain.value = amp;

        this.audioBuffer.connect(this.gain);
        this.gain.connect(this.analyser.getAnalyser());
        this.analyser.connect(this.context.destination);
        this.audioBuffer.start(offset, start, (end - start));
    }
}

angular.module('mainApp').factory('MainLinePlayer', ($rootScope) => {
    const service = {
        currentContext: null,
        stopTimer: null
    };

    function _loadTrackLine() {
        $('.timer-liner').remove();
        $('.timeline').scrollLeft(0);
        $('.timeline').append('<span class="timer-liner"></span>');
        const offsetWidth = $('.timeline')[0].offsetWidth;
        const totalWith = Math.max(offsetWidth, $('.timeline')[0].scrollWidth || 0);
        service.totalTrackWidth = totalWith;
    };

    function _animateTrackLine(left, callback) {
        $('.timer-liner').css('left', left + 'px');
        const offsetWidth = $('.timeline')[0].offsetWidth;
        const scrollLeft = $('.timeline')[0].scrollLeft || 0;

        if (left < service.totalTrackWidth) {
            if (scrollLeft === 0) {
                if (left >= offsetWidth - 20) {
                    $('.timeline').scrollLeft(left - 5);
                }
            } else if ((left - scrollLeft) > 0 && (left - scrollLeft) >= (offsetWidth - 20)) {
                $('.timeline').scrollLeft(left - 5);
            }
            service.animationFrame = window.requestAnimationFrame(callback);
        }
    };

    service.loadPlayback = (tracks, secLength) => {
        service.stop();
        const audioContext = new AudioContext();
        const analyser = new AudioAnalyser(audioContext);
        service.currentContext = audioContext;
        service.currentAnalyser = analyser.getAnalyser();

        service.totalPlayTime = 0;

        tracks.forEach(track => {
            if (!track.loaded || track.error || track.mute) {
                return;
            }
            track.segments.forEach(seg => {
                console.log('Playing seg', seg);
                new BufferTrackLoader(audioContext, track.audioBuffer, analyser).setup(seg.amp, seg.offset, seg.start, seg.end);
                service.totalPlayTime = Math.max(service.totalPlayTime, (seg.offset + seg.end - seg.start));
            });
        });
        _loadTrackLine();

        function _updateTrackOnAnimation() {
            const currentPx = +((secLength * audioContext.currentTime).toFixed(2));
            _animateTrackLine(currentPx, _updateTrackOnAnimation);
        }
        service.animationFrame = window.requestAnimationFrame(_updateTrackOnAnimation);
        _broadcastPlayerEvent('START');

        _setupAutoStopTimer();
    };

    service.pause = function () {
        if (!service.currentContext)
            return;
        service.currentContext.suspend();

        if (service.stopTimer) {
            clearTimeout(service.stopTimer);
            service.stopTimer = null;
        }
        _broadcastPlayerEvent('PAUSE');
    };

    service.resume = function () {
        if (!service.currentContext)
            return;
        service.currentContext.resume();

        _setupAutoStopTimer();
        _broadcastPlayerEvent('START');
    };

    service.stop = function () {
        if (!service.currentContext)
            return;
        service.currentContext.close();
        service.currentContext = null;
        window.cancelAnimationFrame(service.animationFrame);
        $('.timer-liner').remove();
        if (service.stopTimer) {
            clearTimeout(service.stopTimer);
            service.stopTimer = null;
        }
        _broadcastPlayerEvent('STOP');
    };

    function _setupAutoStopTimer() {
        if (service.stopTimer) {
            clearTimeout(service.stopTimer);
        }
        if (!service.totalPlayTime) {
            return;
        }
        service.stopTimer = setTimeout(function () {
            console.log('Auto stopping playback at ', service.totalPlayTime);
            service.stop();
        }, (service.totalPlayTime - service.currentContext.currentTime) * 1000);
    }

    function _broadcastPlayerEvent(...values) {
        setTimeout(function () {
            $rootScope.$broadcast('Player:Event', ...values);
        }, 0);
    }

    return service;
})