const mainApp = angular.module('mainApp', ['ngFileUpload', 'ui.router']);

mainApp.config(function ($stateProvider, $locationProvider, $urlRouterProvider) {
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
        templateUrl: 'synthesizer/main.html'
    }

    $stateProvider.state(welcomePage);
    $stateProvider.state(sampler);
    $stateProvider.state(synthesizer);
});

mainApp.run(($rootScope) => {
    $rootScope.appName = 'Electro Musica';
    $rootScope.keyNotes = {};

    // Load notes JSON
    $.getJSON("assets/notes.json", function (json) {
        $rootScope.keyNotes = json;
    });
});

mainApp.controller('MainCtrl', ($rootScope, $scope, $http, $state) => {
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
            alert('Project is created.');
            window.localStorage.setItem('currentProject', name);
            $state.go('sampler');
        }).catch(() => {
            alert('Problem while creating the project.');
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
            alert('Project is loaded.');
            window.localStorage.setItem('currentProject', name);
            $state.go('sampler');
        }).catch(() => {
            alert('Problem while loading the project.');
        })
    };

    function _init() {
        //Fetch projects
        $http.get('/api/project', {}).then((response) => {
            $scope.allProjects = response.data;
        }).catch(() => {
            alert('Problem while fectching projects.');
        })
    }

    _init();
});

