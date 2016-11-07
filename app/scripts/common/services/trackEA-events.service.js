(function () {
  'use strict';

  /** @ngInject */
  angular
  .module('app.common')
    .service('trackEAEvents', trackEvents);

  trackEvents.$inject = ['OriginAPI'];

  function trackEvents(OriginAPI) {
    var service = {
      record: record
    };

    return service;

    function record(event, attr, value) {

      if(OriginAPI.isInitiated()){
        OriginAPI.trackEvent(event, attr, value);
      }
    }
  }

})();
