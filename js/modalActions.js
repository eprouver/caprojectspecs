app.directive('modalActions', function($rootScope, $sce, states) {
  return {
    templateUrl: '../templates/modal-actions.html',
    controllerAs: 'modalActionsCtrl',
    replace: true,
    scope: {
      ctrl: '='
    },
    controller: function($scope) {
      $scope.editWhich = () => {
        $rootScope.hideModal('#mod-' + $scope.ctrl.type);

        $scope.editingStates.forEach(s => {

          _($scope.diffs).forEach((a, prop, diffs) => {
            if (prop == 'params') {
              _(diffs[prop]).forEach((val, param) => {
                updateParamsRecur($scope.ctrl.current.id, s.items, param, $scope.ctrl.current.params[param]);
              });
            } else {
              updateRecur($scope.ctrl.current.id, s.items, prop, $scope.ctrl.current[prop]);
            }

          })
        })
      }

      const getDiffs = () => {
        if (!$scope.ctrl.original || !$scope.ctrl.current) {
          return false;
        }
        $scope.diffs = getDiff($scope.ctrl.current, $scope.ctrl.original);
        console.log($scope.diffs);
      }

      $scope.editingStates = [];

      $scope.toggleState = (v) => {
        var i = $scope.editingStates.indexOf(v);
        if (i === -1)
          $scope.editingStates.push(v);
        else
          $scope.editingStates.splice(i, 1);
      }

      $scope.$watch('ctrl.current', getDiffs, true);
      $scope.$watch('ctrl.original', () => {
        $scope.editingStates = [$rootScope.activeState()];
      });

      $scope.hasCopy = () => {
        if (!$scope.ctrl.original || !$scope.ctrl.original.id) {
          return [];
        }
        return states.filter(s => getContent(s, 'id', $scope.ctrl.original.id).length);
      }
    }
  }
});
