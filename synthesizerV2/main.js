angular.module('mainApp').controller('SynthV2Ctrl', ($rootScope, $scope, $http, Upload, SynthV2Factory) => {
    $scope.currentProject = {
        channels: []
    };
    $scope.recording = {
        start: 0,
        end: 1
    };
    $scope.controlFlags = {
        recording: false
    };
    $scope.selectedProjectName = '';
    $scope.savedProjects = [];

    $scope.SynthV2Factory = SynthV2Factory;

    $scope.addNewChannel = function () {
        $scope.currentProject.channels.push(SynthV2Factory.getChannel());
        console.log($scope.currentProject.channels);
    };

    $scope.deleteChannel = function (index) {
        $scope.currentProject.channels.splice(index, 1);
    }

    $scope.play = function () {
        SynthV2Factory.playChannels($scope.currentProject.channels);
    };

    $scope.stop = function () {
        SynthV2Factory.stop();
    };

    $scope.pause = function () {
        SynthV2Factory.pause();
    };

    $scope.resume = function () {
        SynthV2Factory.resume();
    };

    $scope.record = function () {
        delete $scope.recording.base64Src;
        $scope.controlFlags.recording = true;
        SynthV2Factory.playChannels($scope.currentProject.channels, $scope.recording);
    };

    $scope.$on('$destroy', () => {
        SynthV2Factory.stop();
    });

    // Update on record time
    $scope.$on('Record:Timer:Update', () => {
        $scope.$digest();
    });

    $scope.$on('Record:Timer:Done', (event, buffer) => {
        $scope.controlFlags.recording = false;
        $scope.recording.base64Src = Utils.arrayBufferToBase64(buffer);
        $scope.updateProjectWithTrack();
        _upadateTheAudioPlayback($scope.recording.base64Src);
        $scope.$digest();
    });

    $scope.exportAudioFromURL = function (channel) {
        if (!channel.url) {
            return;
        }
        var context = new AudioContext();
        var request = new XMLHttpRequest();
        request.open('get', channel.url, true);
        request.responseType = 'arraybuffer';

        request.onload = function () {
            channel.base64Src = Utils.arrayBufferToBase64(request.response);
            context.decodeAudioData(request.response, function (buffer) {
                channel.duration = +(buffer.duration.toFixed(2));
                $scope.$digest();
            });
        };
        request.onerror = function (err) {
            console.log("** An error occurred during the XHR request");
            alert('Unable to load the audio from URL');
        };
        request.send();
    };

    $scope.parseFile = function (channel, file) {
        Upload.mediaDuration(file).then(function (durationInSeconds) {
            Utils.convertFileToArrayBuffer(file, function (arrayBuffer) {
                channel.base64Src = Utils.arrayBufferToBase64(arrayBuffer);
                channel.fileName = file.name;
                channel.duration = +(durationInSeconds.toFixed(2));
            });
        }).catch(err => {
            console.error(err);
            alert('Unable to parse the file. Try again.')
        })
    };

    $scope.loadConfiguration = function (configName) {
        if (!configName) {
            return;
        }
        $http.get('/api/synthesizer/load', {
            params: {
                projectName: configName
            }
        }).then(res => {
            $scope.currentProject.name = res.data.projectName;
            $scope.currentProject.channels = res.data.channels;
            $scope.currentProject.trackId = res.data.trackId;
            $scope.selectedProjectName = '';
            alert('Project loaded successfully');

            if ($scope.currentProject.trackId) {
                _loadTrack();
            }
        }).catch(err => {
            alert('Can not load the selected project. Check console for errors!');
        });
    };

    $scope.updateProject = function (updateTrack) {
        if (!$scope.currentProject.name) {
            return;
        }

        const payload = {
            projectName: $scope.currentProject.name,
            channels: $scope.currentProject.channels,
            trackId: $scope.currentProject.trackId
        };

        if (updateTrack) {
            payload.trackConfig = $scope.recording;
        }

        $http.post('/api/synthesizer/update', payload).then(res => {
            if (res.data.trackId) {
                $scope.currentProject.trackId = res.data.trackId;
            }
            _loadSavedConfigs();
            alert('Successfully updated');
        }).catch(err => {
            alert('Can not load the selected project. Check console for errors!');
        });
    };

    $scope.updateProjectWithTrack = function () {
        //TODO Check for recording
        if (!$scope.recording.base64Src) {
            alert('No recorded buffer found. Please record and then try to save.');
            return;
        }

        $scope.updateProject(true);
    };

    function _loadSavedConfigs() {
        $http.get('/api/synthesizer/list').then(res => {
            $scope.savedProjects = res.data;
        }).catch(err => {
            alert('Can not load saved project. Check console for errors!');
        });
    }

    function _loadTrack() {
        $http.get('/api/track/load', {
            params: {
                trackId: $scope.currentProject.trackId
            }
        }).then(res => {
            $scope.recording = res.data;
            _upadateTheAudioPlayback($scope.recording.base64Src);
        }).catch(err => {
            console.error('Can not load saved track.', err);
        });
    }

    function _upadateTheAudioPlayback(base64Src) {
        document.querySelector("audio").src = `data:audio/ogg;base64,${base64Src}`;
    }

    $scope.addNewChannel();
    _loadSavedConfigs();
});