const mainApp = angular.module('mainApp', ['ngFileUpload', 'ui.router', 'ngToast']);

mainApp.config(function ($stateProvider, $locationProvider, $urlRouterProvider, ngToastProvider) {
    // $locationProvider.html5Mode(true);
    $urlRouterProvider.otherwise('/');

    var welcomePage = {
        name: 'welcome',
        url: '/',
        templateUrl: 'welcome/welcome.html'
    }

    var sampler = {
        name: 'sampler',
        url: '/sampler',
        templateUrl: 'sampler/main.html'
    }

    var synthesizer = {
        name: 'synthesizer',
        url: '/synthesizer',
        templateUrl: 'synthesizerV2/main.html'
    }

    $stateProvider.state(welcomePage);
    $stateProvider.state(sampler);
    $stateProvider.state(synthesizer);

    ngToastProvider.configure({
        verticalPosition: 'top',
        horizontalPosition: 'right',
        animation: 'slide'
    });
});

mainApp.run(($rootScope) => {
    $rootScope.appName = 'Green Studio';
    $rootScope.keyNotes = {};

    // Load notes JSON
    $.getJSON("assets/notes.json", function (json) {
        $rootScope.keyNotes = json;
    });
});

mainApp.controller('MainCtrl', ($rootScope, $scope, $http, $state, ngToast) => {
    // $scope.appMode = 'Sounds';
    // $scope.appMode = 'Editor';
    // $scope.appMode = 'MainLine';
    // $scope.appMode = 'Synth';

    $scope.projectMode = null;
    $scope.allProjects = [];

    $scope.startProject = function (name) {
        if (!name) {
            return;
        }

        $http.post('/api/project', {
            projectName: name,
            configuration: {}
        }).then(() => {
            ngToast.create({
                className: 'success',
                content: 'Project is created.'
            });
            window.localStorage.setItem('currentProject', name);
            $state.go('sampler');
        }).catch(() => {
            ngToast.create({
                className: 'danger',
                content: 'Problem while creating the project.'
            });
        });
    };

    $scope.loadProject = function (name) {
        if (!name) {
            return;
        }

        $http.get('/api/project/load', {
            params: {
                projectName: name
            }
        }).then((response) => {
            ngToast.create({
                className: 'success',
                content: 'Project is loaded.'
            });
            window.localStorage.setItem('currentProject', name);
            $state.go('sampler');
        }).catch(() => {
            ngToast.create({
                className: 'danger',
                content: 'Problem while loading the project.'
            });
        })
    };

    function _init() {
        //Fetch projects
        $http.get('/api/project', {}).then((response) => {
            $scope.allProjects = response.data;
        }).catch(() => {
            ngToast.create({
                className: 'danger',
                content: 'Problem while fetching projects.'
            });
        })
    }

    _init();
});

