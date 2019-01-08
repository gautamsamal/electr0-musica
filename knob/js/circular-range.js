angular.module('mainApp').directive('circularRange', [function () {
      return {
          restrict: 'A',
          terminal: true, 
          priority: 1001, 
          scope: {
              'model': '=',
              'max' : '@',
              'step' : '@',
              'value' : '@',
              'min' : '@'
          },
          link: function (scope, elem, attrs) {
              scope.model = scope.value;
              var $slider = $(elem);
              $($slider).roundSlider({
                  value: scope.model,
                  max: scope.max,
                  step: scope.step,
                  min: scope.min,
                  sliderType: "min-range",
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