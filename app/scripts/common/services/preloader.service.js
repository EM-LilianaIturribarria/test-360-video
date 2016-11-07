(function () {
  'use strict';

  /** @ngInject */
  angular
    .module('app.common')
    .factory('preloaderService', preloaderService);

  preloaderService.$inject = ['preloader'];

  function preloaderService(preloader) {
    // I keep track of the state of the loading images.
    var isLoading = true;
    var isSuccessful = false;
    var percentLoaded = 0;

    // Preload the images; then, update display when returned.
    return {
      bind: function (images, eventHandlers) {
        preloader
          .preloadImages(images)
          .then(function handleResolve(imageLocations) {

          // Loading was successful.
          isLoading = false;
          isSuccessful = true;

          if (eventHandlers['complete']) { 
            eventHandlers['complete']();
          }
        }, function handleReject(imageLocation) {
          // Loading failed on at least one image.
          isLoading = false;
          isSuccessful = false;

          console.error('Image Failed', imageLocation);
          if (eventHandlers['error']) { 
            eventHandlers['error']();
          }
        }, function handleNotify(event) {
          percentLoaded = event.percent;
          if (eventHandlers['progress']) {
            eventHandlers['progress'](percentLoaded);
          }
        });
      }
    };
  }
})();
