app.directive('outputFiles', function($rootScope, $sce) {
  return {
    templateUrl: '../templates/outputFiles.html',
    controllerAs: 'ctrl',
    replace: true,
    scope: {
      content: '='
    },
    controller: function($scope) {
      const ctrl = this;
      ctrl.rendererType = 'fs';

      this.upperCode = function() {
        return $scope.content.code.toUpperCase().replace(/-/g,'');
      }

      this.underscoreCode = function() {
        return $scope.content.code.replace(/-/g,'_');
      }

      this.rendererContent = function() {
        return {
          states: JSON.stringify($scope.content.states.filter(s => !s.baseState).map(s => s.var.toUpperCase())),
        }
      }

      this.rendererWidgets = function() {
        return getContent($scope.content.states[0], 'visualElement', true).filter(w => w.type == 'widget');
      }

      this.getFirstItems = function(id, type) {
        let content = getContent({
          items: Array.prototype.concat.apply([], $scope.content.states.map(s => s.items))
        });
        content = _(content).filter(c => c.id === id).map(c => c.items).flatten().filter(c => c.type === type).uniqBy('id').value();

        return content;
      }

      this.designLists = function() {
        const content = getContent({
          items: Array.prototype.concat.apply([], $scope.content.states.map(s => s.items))
        });
        const assets = _(content).filter(c => c.type === 'asset').uniqBy('id').value();
        const sounds = _(content).filter(c => c.type === 'sound').uniqBy('id').value();

        return {
          assets,
          sounds
        };
      }

      this.constantsFile = function() {
        const allContent = _(getContent({
          items: Array.prototype.concat.apply([], $scope.content.states.map(s => s.items))
        })).uniqBy('id').value();

        const dest = document.createElement('div');
        let visualOutput = {};
        let holder;

        holder = document.createElement('div');
        holder.innerHTML = allContent.filter(c => c.type === 'widget').map(c => {
          if(c.source == 'global') {
            return `import { ${c.var} } from '../widgets/${c.var}';<br/>`;
          }
          return `import { ${c.var} } from './${c.var}';<br/>`;

        }).join('');
        dest.appendChild(holder);
        dest.appendChild(document.createElement('br'));

        /* Starting State is the base state */
        holder = document.createElement('div');
        holder.innerHTML = "const STARTING_STATE = 'state_0';";
        dest.appendChild(holder);
        dest.appendChild(document.createElement('br'));

        /* Starting State is the base state */
        holder = document.createElement('div');
        holder.innerHTML = "const BEFORE_EACH = _.noop;";
        dest.appendChild(holder);
        dest.appendChild(document.createElement('br'));

        /* STATE_DATA_AND_FUNCTIONS */
        $scope.content.states.forEach(s => {
          const stateConstants = {};
          getContent(s, 'visualElement', true).forEach(item => {

              if (!item.params) {
                item.params = {};
              }
              if (!item.var) {
                item.var = item.type + ' NEEDS VAR'
              }

              if(item.type === 'text'){
                item.params.text = item.title;
              }

              stateConstants[item.var] = item.params || {};
          });

          visualOutput[s.var.toUpperCase()] = stateConstants;
        });

        holder = document.createElement('div');
        holder.innerHTML += 'const STATE_DATA_AND_FUNCTIONS = [';
        _(visualOutput).forEach((s, key) => {

          holder.innerHTML += `<br/>{ id: '${key}', ` + _(s).map((values, widgetName) => {
            return `<br/>${widgetName}: {${_(values).map((val, key) => `${key}: ${val}`).join(',<br/>')},<br/> didUpdate: (renderer) => {},<br/> beforeExit: (renderer, callback) => {} }<br/>`;
          } ) + '},';

        });
        holder.innerHTML += '];';
        dest.appendChild(holder);
        dest.appendChild(document.createElement('br'));

        /* Base Visuals */
        holder = document.createElement('div')
        const allVisualContent = JSON.stringify(_(allContent).filter(c => c.visualElement).map(c => {return {id: c.var, type: c.reactComponentType}}).keyBy('id'));
        holder.innerHTML = "const BASE_VISUALS = " + allVisualContent + ';';
        dest.appendChild(holder);
        dest.appendChild(document.createElement('br'));

        /* Global SFX */
        holder = document.createElement('div');
        holder.innerHTML = "const SFX = {<br/>" + allContent.filter(c => c.type === 'sound').filter(c => c.source === 'global').map(c => {
          return `"${c.var}": GLOBAL.SFX.${c.var},`;
        }) + '<br/>};';
        dest.appendChild(holder);
        dest.appendChild(document.createElement('br'));

        /* Widgets */
        holder = document.createElement('div');
        holder.innerHTML = "const WIDGETS = {<br/>" + allContent.filter(c => c.type === 'widget').map(c => {
          return `${c.var}`;
        }) + ',<br/>};';
        dest.appendChild(holder);
        dest.appendChild(document.createElement('br'));

        /* Assets */
        holder = document.createElement('div')
        holder.innerHTML = 'const ASSETS = assets;';
        dest.appendChild(holder);
        dest.appendChild(document.createElement('br'));

        holder = document.createElement('div');
        holder.innerHTML = "const ASSETS_IDS = {" + allContent.filter(c => c.type === 'asset').map((c,i, arr) => {
          return `'${c.var}'${i < arr.length-1 ? ' ,': ''}`;
        }) + '};';
        dest.appendChild(holder);
        dest.appendChild(document.createElement('br'));

        /* Exports */
        holder = document.createElement('div')
        holder.innerHTML = 'export { ' + ['STARTING_STATE', 'BEFORE_EACH', 'STATE_DATA_AND_FUNCTIONS', 'SFX', 'ASSETS', 'ASSETS_IDS', 'BASE_VISUALS', 'WIDGETS'].join(', ') + ', };';
        dest.appendChild(holder);

        return $sce.trustAsHtml(dest.outerHTML.replace(/"/g, '\''));
      }

      this.assetsFile = function() {
        let assets = _(getContent({
          items: Array.prototype.concat.apply([], $scope.content.states.map(s => s.items))
        })).uniqBy('id').filter(c => c.type == 'widget').value();

        assets = assets.map(a => {
          return `lib.${a.var} = function () {` +
          `const b = new createjs.Shape();` +
          `b.graphics.beginFill('${a.demoColor}')` +
          `.drawRect(0, 0, ${a.params.width}, ${a.params.height});` +
          `return b;` +
          `};`
        });

        return assets;
      }

      this.authoringFile = function() {
        const output = {
          "info": {
            "title": $scope.content.code,
            "domain": "Sample FreeStyle"
          },
          "navigation": [{
            "name": "Instruction",
            "screens": [{
              "screen_id": $scope.content.code
            }]
          }],
          "screens": {},
          "adaptivity_decision_points": [],
          "author_info": {
            "export_date": "2018-09-04 18:19:18 America/New_York",
            "author_email": "sample@cainc.com",
            "author_name": "No Author"
          }
        }

        output.screens[$scope.content.code] = {
          "id": $scope.content.code,
          "title": $scope.content.code,
          "style": {
            "_external": `\${content}/shared/styles/${this.underscoreCode()}/style.json`
          },
          "file": {
            "src": "${content}/shared/global/animations/magical_door_entry_07_undefined.js",
            "id": "id-X66F7XhrCMjzcxUQ",
            "type": "animation"
          },
          "type": "fs-t1",
          "properties": {},
          "component": "Instruction"
        }

        return angular.toJson(output, true);
      }

    }
  }
});
