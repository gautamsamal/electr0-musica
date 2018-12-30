angular.module('mainApp').controller('MainLineCtrl', ($rootScope, $scope, $http, MainLinePlayer) => {

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
        $scope.loadSavedTracks();
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
        const maxWidthInPx = +((track.duration * secLength).toFixed(2));
        segments.forEach((seg, index) => {
            seg.startInPx = +((seg.start * secLength).toFixed(2));
            seg.endInPx = +((seg.end * secLength).toFixed(2));
            seg.offsetInPx = +((seg.offset * secLength).toFixed(2));
            // DODO : height of tracker on change of height.
            const elem = $(`<span class="tracker text-center" segment-index="${index}"
                style="min-width: ${minimizedSecLength}px; max-width: ${maxWidthInPx}px; width: ${seg.endInPx - seg.startInPx}px;">
                <span class="start">${seg.start}</span> - <span class="end">${seg.end}</span></span>`);
            $(`#track-path-${track.id}`).append(elem);

            const lastElem = $(`#track-path-${track.id} > span`).last();
            const lastElemLeft = lastElem.position().left;

            const rowLeft = $(`#track-path-${track.id}`).position().left;
            $(elem).css('left', seg.offsetInPx - (parseInt(lastElemLeft) - parseInt(rowLeft)) + 'px');
            //Set left and width;
            seg.left = $(elem).position().left;
            seg.width = $(elem).outerWidth();

            // return;

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
                maxWidth: maxWidthInPx,
                stop: function (event, ui) {
                    console.log('Resize stop : ', ui);
                    console.log('Resize stop : ', seg);
                    _updateSegmentPositions(true);
                    $scope.$digest();
                }
            });
        });
    }

    function _updateSegmentPositions(resized) {
        $('.tracker').each((ind, elem) => {
            const trackerElem = $(elem);
            const tracker = trackerElem.parent();
            const segmentNo = parseInt(trackerElem.attr('segment-index'));
            const trackId = tracker.attr('track-id');

            const track = $scope.configuration.tracks.find(t => t.id === trackId);
            if (!track) {
                return;
            }

            if (track.segments && track.segments[segmentNo]) {
                const seg = track.segments[segmentNo];
                const leftPad = +(trackerElem.position().left) - +(trackerElem.parent().position().left)
                seg.offset = +((leftPad / secLength).toFixed(2));

                if (resized) {
                    const leftChange = +(((trackerElem.position().left - seg.left) / secLength).toFixed(2));
                    seg.start += leftChange;
                    console.log('Left change : ', leftChange);

                    if (!leftChange) {
                        const rightChange = +(((trackerElem.outerWidth() - seg.width) / secLength).toFixed(2));
                        seg.end += rightChange;
                        console.log('Right change : ', rightChange);
                    }
                }
                console.log(seg.left, seg.width)
                seg.left = trackerElem.position().left;
                seg.width = trackerElem.outerWidth();
                console.log(seg.left, seg.width)

                trackerElem.find('.start').html('' + seg.start.toFixed(2));
                trackerElem.find('.end').html('' + seg.end.toFixed(2));
            }

        });
    }

    $scope.addTrack = function (trackInfo) {
        Utils.base64ToAudioBuffer(trackInfo.base64Src, function (err, buffer) {
            if (err) {
                alert(err);
                return;
            }
            const track = {
                id: 'track' + (trackIds++),
                name: trackInfo.synthName,
                synthName: trackInfo.synthName,
                audioBuffer: buffer,
                duration: buffer.duration,
                segments: []
            };
            $scope.configuration.tracks.push(track);
            // Add a default segment
            track.segments.push({
                start: 0,
                end: buffer.duration,
                offset: 0
            });
            _addTrack(track);
            _addTrackElems(track);
            console.log(track);
            alert('Track is added.');
        });
    };

    $scope.loadSavedTracks = function () {
        $http.get('/api/synthesizer/list').then(res => {
            $scope.savedProjects = res.data;
        }).catch(err => {
            alert('Can not load saved project. Check console for errors!');
        });
    }

    $scope.loadSelectedTrack = function (syntProjectName) {
        $http.get('/api/track/load/bysnth', {
            params: {
                projectName: syntProjectName
            }
        }).then(res => {
            $scope.addTrack(res.data);
        }).catch(err => {
            alert('Can not load selected track. Check console for errors!');
        });
    }

    fillTimeLines();
    fillConfiguration();
    $scope.loadSavedTracks();
});