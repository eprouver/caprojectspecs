const state = {
  bottom: 58,
  height: 937,
  top: 27,
  width: 1250,
};

function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

const getContent = (state, prop, value) => {
  if(!state) return [];
  const flatten = (children, extractChildren) => Array.prototype.concat.apply(
    children,
    children.map(x => flatten(extractChildren(x) || [], extractChildren))
  );

  const extractChildren = x => x.items;

  let content = flatten(extractChildren(state.content), extractChildren);

  if(!_.isUndefined(prop) && !_.isUndefined(value)){
    content = content.filter(c => c[prop] === value)
  }

  return content;
};

var app = angular.module("app", ['tg.dynamicDirective', 'ui.sortable', 'ngStorage']).run(($rootScope, $localStorage) => {
  $rootScope.typeToIcon = {
    "workspace": "fa fa-fw fa-window-maximize",
    "text": "fa fa-fw fa-font",
    "asset": "fa fa-fw fa-picture-o",
    "sound": "fa fa-fw fa-volume-up",
    "widget": "fa fa-fw fa-puzzle-piece",
    "setting": "fa fa-fw fa-cogs",
    "container": "fa fa-fw fa-object-group",
    "shape": "fa fa-fw fa-paint-brush",
    "action": "fa fa-fw fa-hand-pointer-o",
    "animation": "fa fa-fw fa-magic",
    "interaction": 'fa fa-fw fa-exchange',
  };

  $rootScope.specData = {
    name: 'New Spec',
    states: [],
  };

  $rootScope.$watch('specData', function(n,o,scope){
    $localStorage.specData = n;
  }, true);

  if($localStorage.specData){
    $rootScope.specData = $localStorage.specData;
  } else {
    $rootScope.specData.states.push({
      active: true,
      baseState: true,
      content: {
        title: 'Base State',
        items: [],
      },
      active: true,
    });
  }

  $rootScope.activeState = () => {
    return _($rootScope.specData.states).find({
      active: true
    });
  };

  $rootScope.getContent = getContent;

  $rootScope.inputJSON = function(input) {
    $rootScope.specData.states = $.parseJSON(input);
  };

  $rootScope.hideModal = function(id) {
    $(id).modal('hide');
  };

  $('#app-holder').show();
});

app.filter('capitalize', function() {
  return function(input) {
    return (!!input) ? input.charAt(0).toUpperCase() + input.substr(1).toLowerCase() : '';
  }
});

app.directive('myDraggable', function($rootScope, $window, states) {
  return {
    restrict: 'A',
    link: function(scope, elm, attrs) {
      elm.draggable({
        containment: "parent",
        helper: 'clone',
        classes: {
          "ui-draggable-dragging": "my-dragging"
        },
        stop: function(e, ui) {
          const newX = ~~(ui.position.left / scope.widthRatio());
          const newY = ~~(ui.position.top / scope.heightRatio());

          if (states.length > 1 && scope.activeState().baseState && confirm(`Update X & Y in all instances of ${scope.item.title}?`)) {
            const updateRecur = (items, property, value) => {
              items.forEach((i) => {
                if (i.id == scope.item.id) {
                  i[property] = value;
                }

                if (i.items && i.items.length) {
                  updateRecur(i.items, property, value);
                }
              });
            }

            states.forEach(s => {
              updateRecur(s.content.items, 'x', newX);
              updateRecur(s.content.items, 'y', newY);
            })
          } else {
            scope.item.x = newX;
            scope.item.y = newY;
          }

          $rootScope.$digest();
          e.stopPropagation();
        },
      });

      elm.resizable({
        containment: "parent",
        stop: function(e, ui) {
          const newWidth = ~~(ui.size.width / scope.widthRatio());
          const newHeight = ~~(ui.size.height / scope.heightRatio());

          if (states.length > 1 && scope.activeState().baseState && confirm(`Update width & height in all instances of ${scope.item.title}?`)) {
            const updateRecur = (items, property, value) => {
              items.forEach((i) => {
                if (i.id == scope.item.id) {
                  i[property] = value;
                }

                if (i.items && i.items.length) {
                  updateRecur(i.items, property, value);
                }
              });
            }

            states.forEach(s => {
              updateRecur(s.content.items, 'width', newWidth);
              updateRecur(s.content.items, 'height', newHeight);
            })
          } else {
            scope.item.width = newWidth;
            scope.item.height = newHeight;
          }

          $rootScope.$digest();
          e.stopPropagation();
        },
      });

      scope.heightRatio = function() {
        const bounds = document.getElementById('place-canvas').getBoundingClientRect();
        return (bounds.height / state.height)
      }

      scope.widthRatio = function() {
        const bounds = document.getElementById('place-canvas').getBoundingClientRect();
        return (bounds.width / state.width)
      }

      scope.getTop = function() {
        return scope.item.y * scope.heightRatio();
      }

      scope.getLeft = function() {
        return scope.item.x * scope.widthRatio();
      }

      angular.element($window).bind('resize', function() {
        scope.$digest();
      });
    }
  };
});

app.controller("content", function($scope, activeState, states) {
  const ctrl = this;

  ctrl.addContent = (state, content, type) => {
    if (!content.id) {
      content.id = type + '_' + guid();
    }
    if (!content.title) {
      content.title = `sample ${content.type}`;
    }
    if (!content.items) {
      content.items = [];
    }
    if (!content.params) {
      content.params = {};
    }

    if (state.baseState) {
      content.baseObject = false;
      states.forEach(s => {
        s.content.items.unshift(angular.copy(content));
      });
    } else {
      content.baseObject = true;
      state.content.items.unshift(content);
    }
  };

  $scope.removeContent = (parent, content) => {
    const index = _(parent).findIndex(c => c.id === content.id);
    if (index > -1) {
      parent.splice(index, 1);
    }
  }

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

    deactivateRecur($scope.activeState().content.items);

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

app.service("states", function($rootScope) {
  return $rootScope.specData.states;
});

app.service("activeState", function(states) {
  const active = _(states).findIndex({
    active: true
  });
  return active;
});

app.controller("states", function($scope, $rootScope) {
  const ctrl = this;
  ctrl.addState = function() {
    const newGuy = angular.copy($scope.baseState);
    newGuy.baseState = false;
    newGuy.content.title = 'New State';
    newGuy.active = false;
    $rootScope.specData.states.push(newGuy);
  };

  ctrl.copyState = function(state) {
    state = angular.copy(state);
    $rootScope.specData.states.push(state);
    ctrl.selectState(state);
  }

  ctrl.removeState = (state) => {
    $rootScope.specData.states.splice($rootScope.specData.states.indexOf(state), 1);
    if (!_($rootScope.specData.states).some(s => s.active)) {
      $rootScope.specData.states[0].active = true;
    }
  };

  ctrl.selectState = (state) => {
    $rootScope.specData.states.forEach(s => (s.active = false));
    state.active = true;
  };

  $scope.$watch('$root.states', () => {
    $scope.baseState = $rootScope.specData.states.filter(s => s.baseState === true)[0];
  });
});

app.controller('sounds', function($scope) {
  const ctrl = this;
  ctrl.type = 'sound';

  const newSound = () => {
    return {
      source: 'authoring',
      title: '',
      type: 'sound',
      new: true,
      visualElement: false,
      canHaveChildren: false,
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

app.controller('settings', function($scope) {
  const ctrl = this;
  ctrl.type = 'setting';

  const newSetting = () => {
    return {
      title: '',
      type: 'setting',
      new: true,
      visualElement: false,
      canHaveChildren: false,
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

app.controller('actions', function($scope) {
  const ctrl = this;
  ctrl.type = 'action';

  const newAction = () => {
    return {
      title: '',
      type: 'action',
      new: true,
      visualElement: false,
      canHaveChildren: false,
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

app.controller('text', function($scope) {
  const ctrl = this;
  ctrl.type = 'text';

  const newText = () => {
    return {
      title: '',
      type: 'text',
      new: true,
      visualElement: true,
      canHaveChildren: true,
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

app.controller('assets', function($scope) {
  const ctrl = this;
  ctrl.type = 'asset';

  const newAsset = () => {
    return {
      title: '',
      type: 'asset',
      new: true,
      visualElement: true,
      canHaveChildren: true,
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

app.controller('widgets', function($scope) {
  const ctrl = this;
  ctrl.type = 'widget';

  const newWidget = () => {
    return {
      title: '',
      type: 'widget',
      new: true,
      visualElement: true,
      canHaveChildren: true,
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

app.controller('containers', function($scope) {
  const ctrl = this;
  ctrl.type = 'container';

  const newContainer = () => {
    return {
      title: '',
      type: 'container',
      new: true,
      visualElement: false,
      canHaveChildren: true,
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

app.controller('animations', function($scope) {
  const ctrl = this;
  ctrl.type = 'animation';

  const newContainer = () => {
    return {
      title: '',
      type: 'animation',
      new: true,
      visualElement: false,
      canHaveChildren: false,
    }
  }

  $scope.$on('new-animation', () => {
    ctrl.current = newContainer();
  });

  $scope.$on('load-animation', (s, content) => {
    $('#mod-animation').modal('show');
    content.new = false;
    ctrl.current = content;
  });
});

app.controller('shapes', function($scope) {
  const ctrl = this;
  ctrl.type = 'shape';

  const newShape = () => {
    return {
      title: '',
      type: 'shape',
      new: true,
      visualElement: true,
      canHaveChildren: true,
    }
  }

  $scope.$on('new-shape', () => {
    ctrl.current = newShape();
  });

  $scope.$on('load-shape', (s, content) => {
    $('#mod-shape').modal('show');
    content.new = false;
    ctrl.current = content;
  });
});

app.controller('interactions', function($scope) {
  const ctrl = this;
  ctrl.type = 'interaction';

  const addInteraction = () => {
    return {
      title: '',
      type: ctrl.type,
      new: true,
      visualElement: false,
      canHaveChildren: true,
    }
  }

  $scope.$on('new-' + ctrl.type, () => {
    ctrl.current = addInteraction();
  });

  $scope.$on('load-' + ctrl.type, (s, content) => {
    $('#mod-' + ctrl.type).modal('show');
    content.new = false;
    ctrl.current = content;
  });
});

app.controller('copy', function($scope) {
  const ctrl = this;


  $scope.$on('new-' + ctrl.type, () => {
    ctrl.current = null;
  });

  ctrl.chooseState = (s) => {
    ctrl.current = s;
  }


});
