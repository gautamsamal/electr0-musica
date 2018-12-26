angular.module('mainApp').controller('PlayerCtrl', ($rootScope, $scope, $http, SynthFactory) => {

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