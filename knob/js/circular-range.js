angular.module('mainApp').directive('circularRange', [function () {
    return {
        restrict: 'A',
        terminal: true,
        priority: 1001,
        scope: {
            'model': '=',
            'max': '@',
            'step': '@',
            'value': '@',
            'min': '@'
        },
        link: function (scope, elem, attrs) {
            if (!scope.model) {
                scope.model = scope.value || 0;
            }
            var $slider = $(elem);
            $($slider).roundSlider({
                value: scope.model,
                max: scope.max,
                step: scope.step,
                min: scope.min,
                sliderType: "min-range",
                radius: 20,
                startAngle: 90,
                endAngle: "+355", // 5 deg buffer just, not to confuse between 0/1
                change: function (ui) {
                    scope.$apply(function () {
                        scope.model = ui.value;
                    });
                },
                drag: function (ui) {
                    scope.$apply(function () {
                        scope.model = ui.value;
                    });
                }
            });

        }
    }
}]);