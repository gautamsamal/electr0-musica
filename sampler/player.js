angular.module('mainApp').factory('MainLinePlayer', ($rootScope) => {
    const service = {

    };

    service.loadPlayback = (trackItem) => {
        if (!trackItem.url) {
            return;
        }

        trackItem.soundFile = new p5.SoundFile(trackItem.url, function () {
            console.log('success');
            trackItem.__playerReady = true;
            $rootScope.$broadcast('Player:ready');
            console.log(trackItem.soundFile.duration());
        }, function (err) {
            console.error('Error---------------', err);
            trackItem.__playerError = true;
        });

        trackItem.getDuration = function () {
            return trackItem.soundFile.duration();
        };
    };

    return service;
})