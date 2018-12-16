angular.module('mainApp').controller('EditorCtrl', ($rootScope, $scope, SoundFactory) => {
    $scope.allNotes = Object.keys($rootScope.keyNotes);

    const trackSource = ['basic', 'music'];
    const secLength = 80;
    const minimizedSecLength = secLength / 8;
    let trackIds = 1;

    $scope.configuration = {
        tracks: [{
            id: 'track' + (trackIds++),
            source: trackSource[0],
            note: 'B1',
            name: 'B1',
            segments: [{
                start: 0,
                end: minimizedSecLength
            }]
        },
        {
            id: 'track' + (trackIds++),
            source: trackSource[0],
            note: 'B2',
            name: 'B2',
            segments: [{
                start: 0,
                end: minimizedSecLength
            }]
        }]
    };

    const getMaximumTime = function (trackId = null) {
        let maxTime = 0;
        $scope.configuration.tracks.forEach(track => {
            if (trackId) {
                if (track.id !== trackId)
                    return;
                track.segments.forEach(seg => {
                    maxTime = Math.max(maxTime, seg.end);
                });
            } else {
                track.segments.forEach(seg => {
                    maxTime = Math.max(maxTime, seg.end);
                });
            }
        });
        return maxTime;
    };

    const removeTrackSegment = function (trackId, segmentNo) {
        segmentNo = parseInt(segmentNo);
        const track = $scope.configuration.tracks.find(t => t.id === trackId);
        if (!track) {
            alert('Invalid Track');
            return;
        }

        if (track.segments && track.segments[segmentNo]) {
            track.segments.splice(segmentNo, 1);
            _addTrackElems(track);
        }
    };

    const addTrackSegment = function (trackId) {
        const track = $scope.configuration.tracks.find(t => t.id === trackId);
        if (!track) {
            alert('Invalid Track');
            return;
        }

        if (!track.segments) {
            track.segments = [];
        }

        const maxTime = getMaximumTime(track.id);
        track.segments.push({
            start: maxTime,
            end: maxTime + minimizedSecLength
        });
        _addTrackElems(track);
    };

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

    function updateContextMenu() {
        $.contextMenu('update');

        $.contextMenu({
            selector: '.tracker',
            items: {
                "delete": {
                    name: "Delete",
                    callback: function (itemKey, opt, e) {
                        console.log("Clicked on ", itemKey, " on element ", opt.$trigger);
                        const elem = $(opt.$trigger[0]);
                        const segmentNo = elem.attr('segment-index');
                        const trackId = $(elem).parent().attr('track-id');

                        removeTrackSegment(trackId, segmentNo);
                        $scope.$digest();
                    }
                }
            }
        });

        $.contextMenu({
            selector: '.track-timing',
            items: {
                "addTune": {
                    name: "Add Tune",
                    callback: function (itemKey, opt, e) {
                        console.log("Clicked on ", itemKey, " on element ", opt.$trigger);
                        const elem = $(opt.$trigger[0]);
                        const trackId = $(elem).attr('track-id');

                        addTrackSegment(trackId);
                        $scope.$digest();
                    }
                }
            }
        });
    }

    $scope.play = function () {
        SoundFactory.play($scope.configuration, secLength);
        $scope.currentPlayer = SoundFactory.currentPlayer;
    }

    $scope.stop = function () {
        SoundFactory.stop($scope.configuration);
        $scope.currentPlayer = null;
    }

    $scope.addTrack = function (note) {
        if (!note) {
            return;
        }
        const track = {
            id: 'track' + (trackIds++),
            source: trackSource[0],
            note: note,
            name: note,
            segments: [{
                start: 0,
                end: minimizedSecLength
            }]
        };
        $scope.configuration.tracks.push(track);
        _addTrack(track);
        _addTrackElems(track);
    };

    fillTimeLines();
    fillConfiguration();
    updateContextMenu();
});