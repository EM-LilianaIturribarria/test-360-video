(function () {
  'use strict';

  /** @ngInject */
  angular
    .module('app.core')
    .run(initAnalytics)
    .config(configure);

  initAnalytics.$inject = [
    'Angularytics', 'CONFIG',
    '$location', 'OriginAPI'
  ];

  /** @ngInject */
  function initAnalytics(
    Angularytics, CONFIG,
    $location, OriginAPI
  ){
    // Override AdId if found
    var adId = $location.search().adId;

    // Init GA
    ga('create', CONFIG.analytics.ga.id);
    Angularytics.init();

    // Init EA
    if((typeof CONFIG.analytics.ea) !== 'undefined' &&
        (CONFIG.analytics.ea !== null)){

      // Init Origin API
      OriginAPI.init({
        adId : adId ? adId : CONFIG.analytics.ea.id,
        placement : CONFIG.analytics.ea.placement
      });
    }
  }

  configure.$inject = [
    '$routeProvider', '$provide', 
    'AngularyticsProvider'
  ];

  /** @ngInject */
  function configure(
    $routeProvider, $provide, 
    AngularyticsProvider
  ){
    AngularyticsProvider.setEventHandlers(['GoogleUniversal']);

    $routeProvider
      .when('/', {
        templateUrl: 'scripts/core/main.html',
        controller: 'MainController',
        controllerAs: 'vm'
    })
    .otherwise({
      redirectTo: '/'
    });

    $provide.constant('CONFIG', {

      // Set here your analytics data
      'analytics': {

        // Google Analytics
        // Don't change the id, we are always tracking internally
        // to Integration Marketing Account
        // Change the category according to the name of 
        // your project
        'ga' : {
          'id': 'UA-12310597-137',
          'category':'[TEST] 360 Video - MOBILE'
        },

        // Evolve Analytics
        // For now... we can only track events sent 
        // from iframes living inside origin
        // Set the id of the origin product you created 
        // For placement, use overthepage for overlays,
        // or inpage 
        // In case you don't need EA (standalone) set it to null
        'ea' : {
         'id' : 1749,
         'placement' : 'overthepage'
        }
      },

      'preload': {
        'images': [
          'assets/images/angular.png'
        ]
      },

      'settings': {
        'type' : 'video'
      }

    });
  }

})();
