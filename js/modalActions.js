app.directive('modalActions', function($rootScope, $sce) {
  return {
    templateUrl: '../templates/modal-actions.html',
    controllerAs: 'modalActionsCtrl',
    replace: true,
    scope: {
      ctrl: '='
    },
    controller: function($scope) {

    }
  }
});
