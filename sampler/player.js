class BufferTrackLoader {
    constructor(context, buffer) {
        this.context = context;
        this.buffer = Utils.cloneAudioBuffer(buffer);
        this.audioBuffer = this.context.createBufferSource();
        this.audioBuffer.buffer = this.buffer;
    }

    setup(offset = 0, start = 0, end = this.buffer.duration) {
        this.audioBuffer.connect(this.context.destination);
        this.audioBuffer.start(offset, start, (end - start));
    }
}

angular.module('mainApp').factory('MainLinePlayer', ($rootScope) => {
    const service = {
        currentContext: null
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
        service.currentContext = audioContext;
        tracks.forEach(track => {
            if (!track.loaded || track.error || track.mute) {
                return;
            }
            track.segments.forEach(seg => {
                console.log('Playing seg', seg);
                new BufferTrackLoader(audioContext, track.audioBuffer).setup(seg.offset, seg.start, seg.end);
            });
        });
        _loadTrackLine();

        function _updateTrackOnAnimation() {
            const currentPx = +((secLength * audioContext.currentTime).toFixed(2));
            _animateTrackLine(currentPx, _updateTrackOnAnimation);
        }
        service.animationFrame = window.requestAnimationFrame(_updateTrackOnAnimation);
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
        window.cancelAnimationFrame(service.animationFrame);
        $('.timer-liner').remove();
    };

    return service;
})