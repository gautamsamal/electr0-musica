angular.module('mainApp').factory('MainLinePlayer', ($rootScope) => {
    const service = {

    };

    service.loadPlayback = (trackItem) => {
        // When ready
        trackItem.__ready = true;
        $rootScope.$broadcast('Track:ready');
    };

    return service;
})