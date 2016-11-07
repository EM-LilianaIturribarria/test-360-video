(function () {
  'use strict';
  angular
    .module('app.common')
    .service('EvolveAnalytics', EvolveAnalytics);

  function EvolveAnalytics() {

    return {

      trackEvent: function(event, attr, value){
        window.ev.origin.api.track({
          event: event,
          attr: attr,
          value: value
        });

        if(attr === 'URL'){
          window.ev.origin.api.sendAnalytics(event, value);
        }
      }
    };
  }

})();
