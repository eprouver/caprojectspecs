const state = {
  height: 852,
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

  let content = flatten(extractChildren(state), extractChildren);

  if(!_.isUndefined(prop) && !_.isUndefined(value)){
    content = content.filter(c => c[prop] === value)
  }

  return content;
};

const removeContent = (state, id) => {
  state.items = state.items
      .filter(i => i.id !== id)
      .map(i => removeContent(i, id));
  return state;
};

const getDiff = (object, base) => {
	function changes(object, base) {
		return _.transform(object, function(result, value, key) {
			if (!_.isEqual(value, base[key])) {
				result[key] = (_.isObject(value) && _.isObject(base[key])) ? changes(value, base[key]) : value;
			}
		});
	}
	return changes(object, base);
}

const updateParamsRecur = (id, items, property, value) => {
  items.forEach((i) => {
    if (i.id == id) {
      i.params[property] = value;
    }

    if (i.items && i.items.length) {
      updateParamsRecur(id, i.items, property, value);
    }
  });
};

const updateRecur = (id, items, property, value) => {
  items.forEach((i) => {
    if (i.id == id) {
      i[property] = value;
    }

    if (i.items && i.items.length) {
      updateRecur(id, i.items, property, value);
    }
  });
};

var app = angular.module("app", ['tg.dynamicDirective', 'ui.sortable', 'ngStorage', 'colorpicker', 'hljs']).run(($rootScope, $localStorage, $timeout) => {
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
    "keyframe": 'fa fa-fw fa-exchange',
  };

  $rootScope.currentView = 'output';

  $rootScope.getContentNum = (type) => {
    return _(getContent({
      items: Array.prototype.concat.apply([], $rootScope.specData.states.map(s => s.items))
    })).uniqBy('id').filter(s => s.type === type).value().length;
  }

  $rootScope.specData = {
    name: 'New Spec',
    states: [],
    originOffsetX: 0,
    originOffsetY: 0,
  };

  $rootScope.delayDigest = () => {
    _.delay(() => {
      $rootScope.$digest();
    });
  }

  $rootScope.$watch('specData', function(n,o,scope){
    $localStorage.specData = n;
  }, true);

  if($localStorage.specData){
    $rootScope.specData = $localStorage.specData;
  } else {
    $rootScope.specData.states.push({
      active: true,
      baseState: true,
      var: 'state_0',
      title: 'Base State',
      items: [],
      active: true,
      renderer: 'canvas',
      originOffsetX: 0,
      originOffsetY: 0,
    });
  }

  $rootScope.activeState = () => {
    return _($rootScope.specData.states).find({
      active: true
    });
  };

  $rootScope.getContent = getContent;

  $rootScope.inputJSON = function(input) {
    $rootScope.specData = $.parseJSON(input);
    $rootScope.specData.states.forEach(s => (s.active = false));
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

app.directive('originOffset', function($rootScope, $window, states) {
  return {
    restrict: 'A',
    link: function(scope, elm, attrs) {

      $rootScope.$watch('currentView', () => {
        if($rootScope.currentView === 'edit'){
          _.delay(() => {
            scope.$digest();
          })
        }
      });

      scope.heightRatio = heightRatio;
      scope.widthRatio = widthRatio;

      elm.draggable({
        containment: "parent",
        helper: 'clone',
        classes: {
          "ui-draggable-dragging": "my-dragging"
        },
        stop: function(e, ui) {
          const newX = ~~(ui.position.left / scope.widthRatio());
          const newY = ~~(ui.position.top / scope.heightRatio());
          $rootScope.specData.originOffsetX = newX;
          $rootScope.specData.originOffsetY = newY;

          $rootScope.$digest();
          e.stopPropagation();
        }
      });

      scope.getTop = function() {
        return $rootScope.specData.originOffsetY * scope.heightRatio();
      }

      scope.getLeft = function() {
        return $rootScope.specData.originOffsetX * scope.widthRatio();
      }
    }
  }
});

const heightRatio = function() {
  const bounds = document.getElementById('place-canvas').getBoundingClientRect();
  return (bounds.height / state.height)
};

const widthRatio = function() {
  const bounds = document.getElementById('place-canvas').getBoundingClientRect();
  return (bounds.width / state.width)
};

app.directive('myDraggable', function($rootScope, $window, states) {
  return {
    restrict: 'A',
    link: function(scope, elm, attrs) {

      scope.heightRatio = heightRatio;
      scope.widthRatio = widthRatio;

      elm.draggable({
        containment: "parent",
        helper: 'clone',
        classes: {
          "ui-draggable-dragging": "my-dragging"
        },
        stop: function(e, ui) {
          const newX = ~~(ui.position.left / scope.widthRatio());
          const newY = ~~(ui.position.top / scope.heightRatio());

          if (states.length > 1 && $rootScope.activeState().baseState && confirm(`Update X & Y in all instances of ${scope.item.title}?`)) {

            states.forEach(s => {
              updateParamsRecur(scope.item.id, s.items, 'x', newX);
              updateParamsRecur(scope.item.id, s.items, 'y', newY);
            })
          } else {
            scope.item.params.x = newX;
            scope.item.params.y = newY;
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

          if (states.length > 1 && $rootScope.activeState().baseState && confirm(`Update width & height in all instances of ${scope.item.title}?`)) {

            states.forEach(s => {
              updateParamsRecur(scope.item.id, s.items, 'width', newWidth);
              updateParamsRecur(scope.item.id, s.items, 'height', newHeight);
            })
          } else {
            scope.item.params.width = newWidth;
            scope.item.params.height = newHeight;
          }

          $rootScope.$digest();
          e.stopPropagation();
        },
      });

      scope.getTop = function() {
        return scope.item.params.y * scope.heightRatio();
      }

      scope.getLeft = function() {
        return scope.item.params.x * scope.widthRatio();
      }

      angular.element($window).bind('resize', function() {
        scope.$digest();
      });
    }
  };
});

app.controller('content', function($scope, $rootScope, states) {
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
        s.items.push(angular.copy(content));
      });
    } else {
      content.baseObject = true;
      state.items.push(content);
    }
  };

  $scope.removeContent = (state, content, baseRemove) => {
    if (baseRemove) {
      if(confirm(`Remove ${content.title} from all screens?`)){
        states.forEach(s => {
          removeContent(s, content.id);
        });
      }
    } else {
      if(confirm(`Remove ${content.title} and children?`)){
        removeContent(state, content.id);
      }
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

    deactivateRecur($rootScope.activeState().items);

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

  this.activeState = $rootScope.activeState();

  $scope.$on('state-change', () => {
    this.activeState = $rootScope.activeState();
  });


  this.getView = function(item) {
    if (item) {
      return 'templates/nestable_item.html';
    }
    return null;
  };
});

app.service("states", function($rootScope) {
  return $rootScope.specData.states;
});

app.controller("states", function($scope, $rootScope) {
  const ctrl = this;
  ctrl.addState = function() {
    const newGuy = angular.copy($scope.baseState);
    newGuy.baseState = false;
    newGuy.title = 'New State';
    newGuy.var = `new_state_${_.uniqueId()}`;
    newGuy.active = false;
    $rootScope.specData.states.push(newGuy);
    ctrl.selectState(newGuy);
  };

  ctrl.copyState = function(state) {
    state = angular.copy(state);
    $rootScope.specData.states.push(state);
    ctrl.selectState(state);
  }

  ctrl.removeState = (state) => {
    if(confirm(`Remove ${state.title}?`)){
      $rootScope.specData.states.splice($rootScope.specData.states.indexOf(state), 1);
      if (!_($rootScope.specData.states).some(s => s.active)) {
        ctrl.selectState($rootScope.specData.states[0]);
      }
    }
  };

  ctrl.selectState = (state) => {
    $rootScope.specData.states.forEach(s => (s.active = false));
    state.active = true;
    $rootScope.$broadcast('state-change');
  };

  $scope.$watch('$root.states', () => {
    $scope.baseState = $rootScope.specData.states.filter(s => s.baseState === true)[0];
  });
});

app.controller('sounds', function($scope, $rootScope) {
  const ctrl = this;
  ctrl.type = 'sound';
  ctrl.reactComponentType = 'functionalComponent';

  const newSound = () => {
    return {
      source: 'style',
      title: '',
      type: ctrl.type,
      reactComponentType: ctrl.reactComponentType,
      new: true,
      var: ctrl.type + '_' + $rootScope.getContentNum(ctrl.type),
      visualElement: false,
      params: {
        visible: true,
      },
      canHaveChildren: false,
    }
  }

  $scope.$on('new-sound', () => {
    ctrl.current = newSound();
  });

  $scope.$on('load-sound', (s, content) => {
    $('#mod-sound').modal('show');
    content.new = false;
    ctrl.original = content;
    ctrl.current = angular.copy(content);
  });
});

app.controller('settings', function($scope, $rootScope) {
  const ctrl = this;
  ctrl.type = 'setting';
  ctrl.reactComponentType = 'functionalComponent';

  const newSetting = () => {
    return {
      title: '',
      type: ctrl.type,
      reactComponentType: ctrl.reactComponentType,
      new: true,
      var: ctrl.type + '_' + $rootScope.getContentNum(ctrl.type),
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
    ctrl.original = content;
    ctrl.current = angular.copy(content);
  });
});

app.controller('actions', function($scope, $rootScope) {
  const ctrl = this;
  ctrl.type = 'action';
  ctrl.reactComponentType = 'functionalComponent';

  const newAction = () => {
    return {
      title: '',
      type: ctrl.type,
      reactComponentType: ctrl.reactComponentType,
      new: true,
      var: ctrl.type + '_' + $rootScope.getContentNum(ctrl.type),
      visualElement: false,
      canHaveChildren: true,
    }
  }

  $scope.$on('new-action', () => {
    ctrl.current = newAction();
  });

  $scope.$on('load-action', (s, content) => {
    $('#mod-action').modal('show');
    content.new = false;
    ctrl.original = content;
    ctrl.current = angular.copy(content);
  });
});

app.controller('widgets', function($scope, $rootScope) {
  const ctrl = this;
  ctrl.type = 'widget';
  ctrl.reactComponentType = 'functionalComponent';

  const newWidget = () => {
    return {
      title: '',
      type: ctrl.type,
      reactComponentType: ctrl.reactComponentType,
      new: true,
      var: ctrl.type + '_' + $rootScope.getContentNum(ctrl.type),
      visualElement: true,
      source: 'renderer',
      params: {
        visible: true,
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      },
      canHaveChildren: true,
    }
  }

  $scope.$on('new-widget', () => {
    ctrl.current = newWidget();
  });

  $scope.$on('load-widget', (s, content) => {
    $('#mod-widget').modal('show');
    content.new = false;
    ctrl.original = content;
    ctrl.current = angular.copy(content);
  });
});

app.controller('containers', function($scope, $rootScope) {
  const ctrl = this;
  ctrl.type = 'container';
  ctrl.reactComponentType = 'functionalComponent';

  const newContainer = () => {
    return {
      title: '',
      type: ctrl.type,
      reactComponentType: ctrl.reactComponentType,
      new: true,
      var: ctrl.type + '_' + $rootScope.getContentNum(ctrl.type),
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
    ctrl.original = content;
    ctrl.current = angular.copy(content);
  });
});

app.controller('animations', function($scope, $rootScope) {
  const ctrl = this;
  ctrl.type = 'animation';
  ctrl.reactComponentType = 'functionalComponent';

  const newContainer = () => {
    return {
      title: '',
      type: ctrl.type,
      reactComponentType: ctrl.reactComponentType,
      new: true,
      var: ctrl.type + '_' + $rootScope.getContentNum(ctrl.type),
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
    ctrl.original = content;
    ctrl.current = angular.copy(content);
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

app.directive('testCanvas', function($rootScope){
  return {
    restrict: 'C',
    scope: {
      items: '='
    },
    link: function(scope, element) {
      element.attr({
        width: state.width,
        height: state.height,
      });

      const render = () => {
        var ctx = element[0].getContext("2d");
        ctx.clearRect(0,0,state.width, state.height);
        ctx.font = "20px Arial";

        scope.items.filter(i => i.visualElement && i.params.visible).forEach(i => {
          ctx.fillStyle = i.demoColor || 'black';
          ctx.fillRect(i.params.x - $rootScope.specData.originOffsetX, i.params.y - $rootScope.specData.originOffsetY, i.params.width, i.params.height);
          ctx.fillStyle = 'black';
          ctx.fillText(i.title,i.params.x - $rootScope.specData.originOffsetX,i.params.y - $rootScope.specData.originOffsetY + 20);
        })
      };

      scope.$watch('items', render, true);
      scope.$watch('$root.specData.originOffsetX', render);
      scope.$watch('$root.specData.originOffsetY', render);
    }
  }
})
