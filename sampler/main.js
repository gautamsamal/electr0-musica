angular.module('mainApp').controller('MainLineCtrl', ($rootScope, $scope, MainLinePlayer) => {

    const trackSource = ['synth', 'external'];
    const secLength = 80;
    const minimizedSecLength = secLength / 8;
    let trackIds = 0;

    $scope.controlFlags = {
        ready: false,
        trackLoader: false
    };

    $scope.configuration = $scope.currentProject.configuration;

    $scope.openSynthesizer = function () {
        $scope.controlFlags.trackLoader = true;
        $("html, body").animate({ scrollTop: 0 }, 500);
    };

    $scope.closeSynthesizer = function () {
        $scope.controlFlags.trackLoader = false;
    };

    // Player ready

    function _checkIfSegmentsReady() {
        let ready = true;
        $scope.configuration.tracks.forEach(track => {
            if (!track.__ready && !track.__error) {
                ready = false;
                return;
            }
        });
        return ready;
    }

    $scope.$on('Track:ready', function () {
        $scope.controlFlags.ready = _checkIfSegmentsReady();
        $scope.$digest();
    });

    const fillTimeLines = function () {
        const maxTime = 50 || 0;
        const panelWidth = $('#editor-panel .scale').width() - 100;
        const secPanels = Math.max(parseInt(panelWidth / secLength), parseInt(maxTime));

        for (let i = 0; i <= secPanels; i++) {
            $('#editor-panel .scale').append(`<div class="scale-sec" style="width:${secLength}px;">${i}</div>`);
        }

        $('#editor .scale').css('display', 'inline-flex');
    };

    const fillConfiguration = function () {
        $scope.configuration.tracks.forEach(track => {
            _addTrack(track);
            _addTrackElems(track);
        });
    };

    function _addTrack(track) {
        const mainTrack = $('#editor-panel .tracks');
        mainTrack.append(`<div class="track">${track.name}</div>`);

        const parentWidth = $('#editor-panel .scale').width();

        // Add timeers
        $('#editor-panel .timeline').append(`<div class="track-timing" id="track-path-${track.id}" track-id="${track.id}" style="width: ${parentWidth}px"></div>`);
    }

    function _addTrackElems(track) {
        //Clear previous elems
        $(`#track-path-${track.id}`).html('');
        const segments = track.segments;
        segments.forEach((seg, index) => {
            return;
            // DODO : height of tracker on change of height.
            const elem = $(`<span class="tracker" segment-index="${index}"
                style="min-width: ${minimizedSecLength}px; width: ${seg.end - seg.start}px;">&nbsp;</span>`);
            $(`#track-path-${track.id}`).append(elem);

            const lastElem = $(`#track-path-${track.id} > span`).last();
            const lastElemLeft = lastElem.position().left;

            const rowLeft = $(`#track-path-${track.id}`).position().left;
            $(elem).css('left', seg.start - (parseInt(lastElemLeft) - parseInt(rowLeft)) + 'px');

            $(elem).draggable({
                containment: "parent",
                axis: "x",
                grid: [minimizedSecLength, 0],
                drag: function (event, ui) {
                    // console.log(ui.position)
                    // if (ui.position.left > 100) {
                    //     event.preventDefault();
                    // }
                },
                stop: function (event, ui) {
                    console.log('Drag stop : ', ui.position);
                    _updateSegmentPositions();
                    console.log('Drag stop : ', seg);
                    $scope.$digest();
                }
            });
            $(elem).resizable({
                containment: `#track-path-${track.id}`,
                handles: "e, w",
                grid: [minimizedSecLength, 0],
                stop: function (event, ui) {
                    console.log('Resize stop : ', ui.position);
                    _updateSegmentPositions();
                    $scope.$digest();
                }
            });
        });
    }

    function _updateSegmentPositions() {
        $('.tracker').each((ind, elem) => {
            const trackerElem = $(elem);
            const segmentNo = parseInt(trackerElem.attr('segment-index'));
            const trackId = trackerElem.parent().attr('track-id');

            const track = $scope.configuration.tracks.find(t => t.id === trackId);
            if (!track) {
                return;
            }

            if (track.segments && track.segments[segmentNo]) {
                track.segments[segmentNo].start = parseInt(trackerElem.position().left) - parseInt(trackerElem.parent().position().left);
                track.segments[segmentNo].end = track.segments[segmentNo].start + trackerElem.outerWidth();
            }

        });
    }

    $scope.addTrack = function () {
        const track = {
            id: 'track' + (trackIds++),
            source: trackSource[0],
            name: 'track' + (trackIds),
            segments: []
        };
        $scope.configuration.tracks.push(track);
        _addTrack(track);
        _addTrackElems(track);
    };

    fillTimeLines();
    fillConfiguration();
});