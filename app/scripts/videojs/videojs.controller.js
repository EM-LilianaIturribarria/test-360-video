(function () {
  'use strict';

  /** @ngInject */
  angular
    .module('app.videojs')
    .controller('VideoJSController', VideoJSController);

  VideoJSController.$inject = ['$scope'];

  function VideoJSController($scope){
    var vm = this;
  }

})();
