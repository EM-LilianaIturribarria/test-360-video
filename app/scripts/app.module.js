(function () {
  'use strict';                

  /** @ngInject */
  angular.module('app', [      
    'app.core',
    'app.common',
    'app.videojs'
  ]);
  
  // use this as an alternative aproach to bootstraping the app withing the
  // html element, <body ng-app="app" ng-strict-di>
  angular.element(document).ready(function () {
     angular.bootstrap(document.getElementsByTagName('body')[0], ['app'], {
       'strictDi': true 
     });
   });

})();
