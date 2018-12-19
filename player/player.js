angular.module('mainApp').controller('PlayerCtrl', ($rootScope, $scope, SynthFactory) => {

    $scope.channels = [];

    $scope.loadSample = function () {
        $scope.channels = SynthFactory.getSampleTracks();
    }

    $scope.newChannel = function () {
        $scope.channels.push(SynthFactory.getChannel());
    }

    $scope.deleteChannel = function (index) {
        $scope.channels.splice(index, 1);
    }

    $scope.loadChannel = function (note) {
        if (!note) {
            return;
        }
        const channel = SynthFactory.parsePredefinedChannel(note);
        if (channel) {
            $scope.channels.push(channel);
        }
    };

    $scope.play = function () {
        SynthFactory.playChannels($scope.channels);
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

    $scope.newChannel();
});