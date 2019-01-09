angular.module('mainApp').controller('SynthV2Ctrl', ($rootScope, $scope, SynthV2Factory) => {
    $scope.channels = [];
    $scope.SynthV2Factory = SynthV2Factory;

    $scope.addNewChannel = function () {
        $scope.channels.push(SynthV2Factory.getChannel());
        console.log($scope.channels);
    };

    $scope.addNewChannel();
});