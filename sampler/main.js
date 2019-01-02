angular.module('mainApp').controller('MainLineCtrl', ($rootScope, $scope, $http, $state, $timeout, MainLinePlayer) => {

    const secLength = 80;
    const minimizedSecLength = secLength / 8;
    let trackIds = 0;

    $scope.controlFlags = {
        ready: false,
        trackLoader: false,
        retrySaving: false
    };

    $scope.currentProject = {};
    $scope.configuration = {
        tracks: []
    };

    function _fetchCurrentProject(callback) {
        const projectName = window.localStorage.getItem('currentProject');
        if (!projectName) {
            alert('No recent project found');
            $state.go('welcome');
            return;
        }

        $http.get('/api/project/load', {
            params: {
                projectName: projectName
            }
        }).then(response => {
            $scope.currentProject.projectName = projectName;
            $scope.currentProject.configuration = response.data || {};
            $scope.configuration = $scope.currentProject.configuration;
            if (!$scope.configuration.tracks) {
                $scope.configuration.tracks = [];
            }
            _checkAllTracks(callback);
        }).catch(err => {
            alert('Error while fetching recent project');
            console.error(err);
            $state.go('welcome');
        });
    };

    /**
     * Check all the saved tracks, initiate the buffer if needed.
     * @param {function} callback
     */
    function _checkAllTracks(callback) {
        if ($scope.configuration.tracks.length === 0) {
            callback()
            return;
        }

        const promiseArr = [];
        $scope.configuration.tracks.forEach(track => {
            if (!track.synthName) {
                // Not a synthesizer
                track.loaded = true;
                return;
            }
            promiseArr.push(_loadSelectedTrack(track.synthName).then(({ trackInfo, buffer }) => {
                track.id = 'track' + (trackIds++);
                track.loaded = true;
                track.audioBuffer = buffer;
                if (track.duration !== buffer.duration) {
                    track.error = true;
                    track.errorMessage = 'Duration mismatch';
                }
            }).catch(err => {
                track.error = true;
                track.errorMessage = err.message ? err.message : String(err);
            }));
        });

        Promise.all(promiseArr).then(() => {
            callback();
        });
    }

    function _updateCurrentProject(manual) {
        $scope.controlFlags.retrySaving = false;
        const configuration = {
            tracks: []
        };

        $scope.configuration.tracks.forEach(track => {
            const trackCopy = Object.assign({}, track);
            delete trackCopy.id;
            delete trackCopy.audioBuffer;
            delete trackCopy.loaded;
            delete trackCopy.error;
            delete trackCopy.errorMessage;
            trackCopy.segments = [];

            track.segments.forEach(seg => {
                trackCopy.segments.push({
                    start: seg.start,
                    end: seg.end,
                    offset: seg.offset
                });
            });

            configuration.tracks.push(trackCopy);
        });

        $http.post('/api/project', {
            projectName: $scope.currentProject.projectName,
            configuration: configuration
        }).then(() => {
            console.log('Project is saved', new Date());
        }).catch(() => {
            console.error('Problem while saving the project.');
            if (manual) {
                alert('Error while saving the project');
            }
            $scope.controlFlags.retrySaving = true;
        });
    }

    $scope.retrySaving = function () {
        _updateCurrentProject(true);
    };

    $scope.$on('Project:Save:Trigger', () => {
        _updateCurrentProject();
    });

    $scope.openSynthesizer = function () {
        $scope.controlFlags.trackLoader = true;
        $("html, body").animate({ scrollTop: 0 }, 500);
    };

    $scope.closeSynthesizer = function () {
        $scope.controlFlags.trackLoader = false;
        $scope.loadSavedTracks();
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

            $(elem).css('left', seg.offsetInPx + 'px');

            // return;

            $(elem).draggable({
                containment: "parent",
                axis: "x",
                // grid: [minimizedSecLength, 0],
                drag: function (event, ui) {
                    // Prevent overlap
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
                // grid: [minimizedSecLength, 0],
                maxWidth: maxWidthInPx,
                resize: function (event, ui) {
                    // console.log('Resize start : ', ui);
                    // console.log('Resize start : ', seg);

                    let start = seg.start;
                    let end = seg.end;

                    const leftChange = +(((ui.position.left - seg.left) / secLength).toFixed(2));
                    start += leftChange;
                    console.log('Resize start Change in left : ', start, leftChange);
                    if (leftChange !== 0 && start <= 0) {
                        $(this).mouseup();
                    }

                    if (leftChange === 0) {
                        const rightChange = +(((ui.size.width - seg.width) / secLength).toFixed(2));
                        end += rightChange;
                        console.log('Resize start Change in right : ', end, rightChange);
                        if (rightChange !== 0 && end >= track.duration) {
                            $(this).mouseup();
                        }
                    }
                },
                stop: function (event, ui) {
                    // console.log('Resize stop : ', ui);
                    // console.log('Resize stop : ', seg);
                    _updateSegmentPositions(true);
                    $scope.$digest();
                }
            });

            //Set left and width;
            seg.left = $(elem)[0].offsetLeft;
            seg.width = $(elem).outerWidth();
        });
    }

    function getMaximumTime(trackId = null) {
        let maxTime = 0;
        $scope.configuration.tracks.forEach(track => {
            if (trackId) {
                if (track.id !== trackId)
                    return;
                track.segments.forEach(seg => {
                    maxTime = Math.max(maxTime, (seg.left + seg.width));
                });
            } else {
                track.segments.forEach(seg => {
                    maxTime = Math.max(maxTime, (seg.left + seg.width));
                });
            }
        });
        return +((maxTime / secLength).toFixed(2));
    };

    function removeTrackSegment(trackId, segmentNo) {
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
    }

    function addTrackSegment(trackId) {
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
            offset: maxTime,
            start: 0,
            end: track.duration
        });
        _addTrackElems(track);
    };

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
                const leftPad = +(trackerElem[0].offsetLeft);
                seg.offset = +((leftPad / secLength).toFixed(2));

                if (resized) {
                    const leftChange = +(((trackerElem[0].offsetLeft - seg.left) / secLength).toFixed(2));
                    seg.start += leftChange;
                    console.log('Left change : ', leftChange);

                    if (!leftChange) {
                        const rightChange = +(((trackerElem.outerWidth() - seg.width) / secLength).toFixed(2));
                        seg.end += rightChange;
                        console.log('Right change : ', rightChange);
                    }
                }
                console.log('old', seg.left, seg.width)
                seg.left = trackerElem[0].offsetLeft;//trackerElem.position().left;
                seg.width = trackerElem.outerWidth();
                console.log('new ', seg.left, seg.width)

                trackerElem.find('.start').html('' + seg.start.toFixed(2));
                trackerElem.find('.end').html('' + seg.end.toFixed(2));
            }

        });
    }

    /**
     * Context menu to add or remove track segments
     */
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

    $scope.loadSelectedTrack = function (syntProjectName) {
        $scope.controlFlags.ready = false;
        _loadSelectedTrack(syntProjectName).then(({ trackInfo, buffer }) => {
            const track = {
                id: 'track' + (trackIds++),
                name: trackInfo.synthName,
                synthName: trackInfo.synthName,
                audioBuffer: buffer,
                duration: buffer.duration,
                loaded: true,
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
            $scope.controlFlags.ready = true;
            _digest();
        }).catch(err => {
            console.error(err);
            $scope.controlFlags.ready = true;
            alert('Some error ocuured');
        });
    };

    $scope.loadSavedTracks = function () {
        $http.get('/api/synthesizer/list').then(res => {
            $scope.savedProjects = res.data;
        }).catch(err => {
            alert('Can not load saved project. Check console for errors!');
        });
    }

    function _loadSelectedTrack(syntProjectName) {
        return new Promise((resolve, reject) => {
            $http.get('/api/track/load/bysnth', {
                params: {
                    projectName: syntProjectName
                }
            }).then(res => {
                Utils.base64ToAudioBuffer(res.data.base64Src, function (err, buffer) {
                    if (err) {
                        return reject(err);
                    }
                    resolve({
                        trackInfo: res.data,
                        buffer: buffer
                    });
                });
            }).catch(err => {
                reject(err);
            });
        });
    }

    function _digest() {
        $scope.$digest();
    }

    _fetchCurrentProject(function () {
        fillTimeLines();
        fillConfiguration();
        $scope.loadSavedTracks();
        updateContextMenu();
        $scope.controlFlags.ready = true;
        _digest();
    });
});