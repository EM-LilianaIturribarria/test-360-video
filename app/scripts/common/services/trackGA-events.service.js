(function () {
  'use strict';
  
  /** @ngInject */
  angular
  .module('app.common')
    .service('trackGAEvents', trackEvents);

  trackEvents.$inject = ['Angularytics', 'CONFIG'];

  function trackEvents(Angularytics, CONFIG) {
    var service = {
      record: record
    };

    return service;

    function record(action, label) {
      var category = CONFIG.analytics.ga.category;
      
      Angularytics.trackEvent(category, action, label);
    }
  }

})();
