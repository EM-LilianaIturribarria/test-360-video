(function () {
  'use strict';

  angular
    .module('app.core')
    .controller('MainController', MainController);
  
  MainController.$inject = [
    '$q', '$scope',
    '$timeout', 'CONFIG',
    'preloaderService', 'trackGAEvents',
    'siActivityIndicator'
  ];
  
  /** @ngInject */
  function MainController(
    $q, $scope,
    $timeout, CONFIG,
    preloader, trackGAEvents,
    siAi
  ){
    var vm = this;
    vm.app = {
      ready: false,
      type: CONFIG.settings.type,
      videojs : {
        ended: false,
        api: {
          callback: function(){
            vm.onVideoReady();
          },
          onVideoEnded: function(){
            vm.onVideoComplete();
          }
        }
      }
    };
    // 'preload' object that holds
    // defs map and promises array.
    // ADD any promise to preload.promises
    // array that should be fulfilled while
    // preload is animating.
    var preload = {
      'defs': {}
    };

    preload.promises = [
      (preload.defs.images = $q.defer()).promise,
      (preload.defs.video = $q.defer()).promise
    ];

    // Start SI ActivityIndicator;
    siAi.start();

    // Pass image list to preloadService
    // with 'preload.defs.images.resolve' as callback.
    preloader.bind(
      CONFIG.preload.images,
      {
        'complete': preload.defs.images.resolve
      }
    );

    // Solve Promise when video is ready to play
    vm.onVideoReady = function() {
      vm.app.ready = true;
      preload.defs.video.resolve();
    };

    // Do something on video ended
    vm.onVideoComplete = function(){
      vm.app.videojs.ended = true;
    };
    
    // When all preload promises are resolved
    $q.all(preload.promises)
      .then(function() {
        var video = !!vm.app.videojs.api.play;
        // Tracking only load for GA 
        // in EA we dont track it as Origin
        // takes care of that
        trackGAEvents.record('[Load]');
        siAi.stop();
        video ? vm.app.videojs.api.play() : angular.noop();
      });
  }
})();
