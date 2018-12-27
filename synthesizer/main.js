angular.module('mainApp').controller('PlayerCtrl', ($rootScope, $scope, $http, Upload, SynthFactory) => {

    $scope.recording = {
        start: 0,
        end: 1
    };
    $scope.selectedProjectName = '';
    $scope.currentProject = {
        channels: []
    };
    $scope.savedProjects = [];
    $scope.SynthFactory = SynthFactory;

    $scope.loadSample = function () {
        $scope.currentProject.channels = SynthFactory.getSampleTracks();
    }

    $scope.newChannel = function () {
        $scope.currentProject.channels.push(SynthFactory.getChannel());
    }

    $scope.deleteChannel = function (index) {
        $scope.currentProject.channels.splice(index, 1);
    }

    $scope.loadChannel = function (note) {
        if (!note) {
            return;
        }
        const channel = SynthFactory.parsePredefinedChannel(note);
        if (channel) {
            $scope.currentProject.channels.push(channel);
        }
    };

    $scope.play = function () {
        SynthFactory.playChannels($scope.currentProject.channels);
    };

    $scope.stop = function () {
        SynthFactory.stop();
    };

    $scope.pause = function () {
        SynthFactory.pause();
    };

    $scope.resume = function () {
        SynthFactory.resume();
    };

    $scope.record = function () {
        SynthFactory.playChannels($scope.currentProject.channels, $scope.recording);
    };

    $scope.$on('$destroy', () => {
        SynthFactory.stop();
    });

    // Update on record time
    $scope.$on('Record:Timer:Update', () => {
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
            $scope.currentProject.name = configName;
            $scope.currentProject.channels = res.data;
            $scope.selectedProjectName = '';
            alert('Project loaded successfully');
        }).catch(err => {
            alert('Can not load the selected project. Check console for errors!');
        });
    };

    $scope.updateProject = function () {
        if (!$scope.currentProject.name) {
            return;
        }
        $http.post('/api/synthesizer/update', {
            projectName: $scope.currentProject.name,
            configuration: $scope.currentProject.channels
        }).then(res => {
            _loadSavedConfigs();
            alert('Successfully updated');
        }).catch(err => {
            alert('Can not load the selected project. Check console for errors!');
        });
    };

    function _loadSavedConfigs() {
        $http.get('/api/synthesizer/list').then(res => {
            $scope.savedProjects = res.data;
        }).catch(err => {
            alert('Can not load saved project. Check console for errors!');
        });
    }

    $scope.newChannel();
    _loadSavedConfigs();
});