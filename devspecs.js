const screen = {
  bottom: 58,
  height: 937,
  top: 27,
  width: 1250,
};

var app = angular.module("app", ['tg.dynamicDirective', 'ui.sortable']).run(($rootScope, screens) => {
  $rootScope.screens = screens;
  $rootScope.activeScreen = () => {
    return _($rootScope.screens).find({
      active: true
    });
  };

  $rootScope.selectedScreen = () => {
    return $rootScope.screens.some(s => s.active);
  };

  $rootScope.getVisibleContent = (screen) => {
    const flatten = (children, extractChildren) => Array.prototype.concat.apply(
      children,
      children.map(x => flatten(extractChildren(x) || [], extractChildren))
    );

    const extractChildren = x => x.items;

    return flatten(extractChildren(screen.content), extractChildren).filter(c => c.visible)
  };

  $rootScope.inputJSON = function(input){
    $rootScope.screens = $.parseJSON(input);
  };

  $rootScope.hideModal = function(id){
    $(id).modal('hide');
  };

  $('#app-holder').show();
});

app.filter('capitalize', function() {
    return function(input) {
      return (!!input) ? input.charAt(0).toUpperCase() + input.substr(1).toLowerCase() : '';
    }
});

app.directive('myDraggable', function($rootScope, $window) {
  return {
    restrict: 'A',
    link: function(scope, elm, attrs) {
      elm.draggable({
        containment: "parent",
        stop: function(e, ui){
          scope.item.x = ~~(ui.position.left / scope.widthRatio());
          scope.item.y = ~~(ui.position.top / scope.heightRatio());
          $rootScope.$digest();
        },
      });

      elm.resizable({
        containment: "parent",
        stop: function(e, ui) {
          scope.item.width = ~~(ui.size.width / scope.widthRatio());
          scope.item.height = ~~(ui.size.height / scope.heightRatio());
          $rootScope.$digest();
        },
      });

      scope.heightRatio = function() {
        const bounds = document.getElementById('place-canvas').getBoundingClientRect();
        return ( bounds.height / screen.height)
      }

      scope.widthRatio = function() {
        const bounds = document.getElementById('place-canvas').getBoundingClientRect();
        return ( bounds.width / screen.width)
      }

      scope.getTop = function(){
        return scope.item.y * scope.heightRatio();
      }

      scope.getLeft = function(){
        return scope.item.x * scope.widthRatio();
      }

      angular.element($window).bind('resize', function(){
        scope.$digest();
      });
    }
  };
});

app.controller("content", function($scope, activeScreen) {
  $scope.addContent = (screen, content) => {
    if (!content.id) {
      content.id = _.uniqueId('content_');
    }
    if(!content.title){
      content.title = `sample ${content.type}`;
    }
    if(!content.items){
      content.items = [];
    }
    if(!content.params){
      content.params = {};
    }
    screen.content.items.push(content);
  };

  $scope.removeContent = (parent, content) => {
    const index = _(parent).findIndex(c => c.id === content.id);
    if (index > -1) {
      parent.splice(index, 1);
    }
  }

  $scope.replaceContent = (screen, content) => {
    const index = _(screen.content.items).findIndex(c => c.id === content.id);
    if (!content.id) {
      content.id = _.uniqueId('content_');
    }

    if (index > -1) {
      screen.content.items.splice(index, content);
    } else {
      $scope.addContent(screen, content);
    }
  };

  this.setActive = function(item) {
    const deactivateRecur = (items) => {
      items.forEach((i) => {
        if (item && i === item) {
          i.active = !i.active;
        } else {
          i.active = false;
        }

        if (i.items && i.items.length) {
          deactivateRecur(i.items);
        }
      });
    }

    deactivateRecur($scope.activeScreen().content.items);

  }

  $scope.sortingLog = [];

  $scope.sortableOptions = {
    connectWith: ".apps-container",
    over: function(e, helper) {
      $(this).addClass('drop-here');
      e.stopImmediatePropagation();
    },
    out: function() {
      $(this).removeClass('drop-here');
    },
    distance: 5,
  };


  this.getView = function(item) {
    if (item) {
      return 'nestable_item.html';
    }
    return null;
  };
});

app.service("screens", function() {
  return [];
});

app.service("activeScreen", function(screens) {
  const active = _(screens).findIndex({
    active: true
  });
  return active;
});

app.controller("screens", function($scope, screens) {
  $scope.addScreen = function() {
    screens.push({
      active: !_(screens).some(s => s.active),
      content: {
        title: 'New State',
        items: [],
      },
    });
  };

  $scope.copyScreen = function(screen) {
    screen = angular.copy(screen);
    screens.push(screen);
    $scope.selectScreen(screen);
  }

  $scope.removeScreen = i => {
    screens.splice(i, 1);
    if (!_(screens).some(s => s.active)) {
      screens[0].active = true;
    }
  };

  $scope.selectScreen = screen => {
    screens.forEach(s => (s.active = false));
    screen.active = true;
  };

  $scope.addScreen();
});

app.controller('sounds', function($scope){
  const ctrl = this;
  ctrl.type = 'sound';

  const newSound = () => {
    return {
      source: 'authoring-audio',
      title: '',
      type: 'sound',
      new: true,
      visible: false,
    }
  }

  $scope.$on('new-sound', () => {
    ctrl.current = newSound();
  });

  $scope.$on('load-sound', (s, content) => {
    $('#mod-sound').modal('show');
    content.new = false;
    ctrl.current = content;
  });
});

app.controller('settings', function($scope){
  const ctrl = this;
  ctrl.type = 'setting';

  const newSetting = () => {
    return {
      title: '',
      type: 'setting',
      new: true,
      visible: false,
    }
  }

  $scope.$on('new-setting', () => {
    ctrl.current = newSetting();
  });

  $scope.$on('load-setting', (s, content) => {
    $('#mod-setting').modal('show');
    content.new = false;
    ctrl.current = content;
  });
});

app.controller('actions', function($scope){
  const ctrl = this;
  ctrl.type = 'action';

  const newAction = () => {
    return {
      title: '',
      type: 'action',
      new: true,
      visible: false,
    }
  }

  $scope.$on('new-action', () => {
    ctrl.current = newAction();
  });

  $scope.$on('load-action', (s, content) => {
    $('#mod-action').modal('show');
    content.new = false;
    ctrl.current = content;
  });
});

app.controller('text', function($scope){
  const ctrl = this;
  ctrl.type = 'text';

  const newText = () => {
    return {
      title: '',
      type: 'text',
      new: true,
      visible: true,
    }
  }

  $scope.$on('new-text', () => {
    ctrl.current = newText();
  });

  $scope.$on('load-text', (s, content) => {
    $('#mod-text').modal('show');
    content.new = false;
    ctrl.current = content;
  });
});

app.controller('assets', function($scope){
  const ctrl = this;
  ctrl.type = 'asset';

  const newAsset = () => {
    return {
      title: '',
      type: 'asset',
      new: true,
      visible: true,
    }
  }

  $scope.$on('new-asset', () => {
    ctrl.current = newAsset();
  });

  $scope.$on('load-asset', (s, content) => {
    $('#mod-asset').modal('show');
    content.new = false;
    ctrl.current = content;
  });
});

app.controller('widgets', function($scope){
  const ctrl = this;
  ctrl.type = 'widget';

  const newWidget = () => {
    return {
      title: '',
      type: 'widget',
      new: true,
      visible: true,
    }
  }

  $scope.$on('new-widget', () => {
    ctrl.current = newWidget();
  });

  $scope.$on('load-widget', (s, content) => {
    $('#mod-widget').modal('show');
    content.new = false;
    ctrl.current = content;
  });
});

app.controller('containers', function($scope){
  const ctrl = this;
  ctrl.type = 'container';

  const newContainer = () => {
    return {
      title: '',
      type: 'container',
      new: true,
      visible: true,
    }
  }

  $scope.$on('new-container', () => {
    ctrl.current = newContainer();
  });

  $scope.$on('load-container', (s, content) => {
    $('#mod-container').modal('show');
    content.new = false;
    ctrl.current = content;
  });
});
