app.controller('outputFiles', function($rootScope) {
  const ctrl = this;

  this.designLists = function() {
    const content =  getContent({content: {items:Array.prototype.concat.apply([],$rootScope.specData.states.map(s => s.content))}});
    const assets = _(content).filter(c => c.type === 'asset').uniqBy('id').value();
    const sounds = _(content).filter(c => c.type === 'sound').uniqBy('id').value();

    return {
      assets, sounds
    };
  }

  this.constantsFile = function() {

  }

  this.skinFile = function() {

  }

  this.unitTests = function() {

  }

  this.integrationTests = function() {

  }

  this.assetsFile = function() {

  }

  this.authoringFile = function() {

  }

  this.displayFile = function() {

  }

  this.orchestratorFile = function() {

  }

  this.assemblyFile = function() {

  }

})
